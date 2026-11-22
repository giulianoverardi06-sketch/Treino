import { useLiveQuery } from 'dexie-react-hooks';
import { AlertTriangle, ChevronRight, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { LETTER_STYLES } from '@/components/letterStyles';
import { PageHeader } from '@/components/PageHeader';
import { Segmented } from '@/components/PeriodFilter';
import { SessionChart, type ChartPoint } from '@/components/SessionChart';
import { db } from '@/db/db';
import { EQUIPMENT_LABELS, MUSCLE_LABELS } from '@/domain/labels';
import { lateralInitialRepsMetric } from '@/domain/lateralMetric';
import {
  filterByPeriod,
  lateralSessionIds,
  loadTrend,
  type Period,
  type Trend,
} from '@/domain/progress';
import { exerciseRecords, exerciseSessionStats, type ExerciseSessionStat } from '@/domain/records';
import type { Exercise, Letter, Session } from '@/domain/types';
import { describeSets, formatKg, formatShortDate, plural } from '@/lib/format';

const PERIODS = [
  { value: '30d', label: '30 dias' },
  { value: '90d', label: '90 dias' },
  { value: '1y', label: '1 ano' },
  { value: 'all', label: 'Tudo' },
] as const satisfies readonly { value: Period; label: string }[];

interface DetailData {
  now: Date;
  exercise: Exercise;
  sessions: Session[];
  stats: ExerciseSessionStat[];
}

export function ExerciseDetailPage() {
  const { id = '' } = useParams();
  const data = useLiveQuery(async (): Promise<DetailData | null> => {
    const exercise = await db.exercises.get(id);
    if (!exercise) return null;
    const [sessions, logs] = await Promise.all([
      db.sessions.toArray(),
      db.setLogs.where('exerciseId').equals(id).toArray(),
    ]);
    const concluded = sessions.filter((s) => s.status === 'concluida');
    return {
      now: new Date(),
      exercise,
      sessions,
      stats: exerciseSessionStats(id, concluded, logs),
    };
  }, [id]);

  if (data === undefined) return <p className="text-sm text-muted">Carregando…</p>;
  if (data === null) {
    return (
      <>
        <PageHeader title="Exercício" backTo="/progresso" historyBack />
        <p className="text-sm text-muted">Exercício não encontrado.</p>
      </>
    );
  }
  return <ExerciseDetail data={data} />;
}

function trendText(t: Trend): string {
  switch (t.kind) {
    case 'insufficient':
      return 'Poucos dados para tendência.';
    case 'up':
      return `Carga subiu ${formatKg(t.deltaKg)} nas últimas ${t.sessions} sessões.`;
    case 'down':
      return `Carga caiu ${formatKg(t.deltaKg)} nas últimas ${t.sessions} sessões.`;
    case 'stable':
      return t.sessions >= 2
        ? `Estável em ${formatKg(t.weightKg)} há ${t.sessions} sessões.`
        : `Carga estável em ${formatKg(t.weightKg)}.`;
  }
}

const TREND_ICON = { up: TrendingUp, down: TrendingDown, stable: Minus, insufficient: Minus };

function ExerciseDetail({ data }: { data: DetailData }) {
  const { exercise, stats, sessions, now } = data;
  const [period, setPeriod] = useState<Period>('90d');
  const letterOf = new Map(sessions.map((s) => [s.id, s.letter]));
  const letter = (id: string): Letter => letterOf.get(id) ?? 'A';

  const inPeriod = filterByPeriod(stats, period, now);
  const point = (s: ExerciseSessionStat, value: number): ChartPoint => ({
    sessionId: s.sessionId,
    date: s.date,
    letter: letter(s.sessionId),
    value,
  });
  const weightPoints = inPeriod.map((s) => point(s, s.maxWeightKg));
  const withReps = inPeriod.filter((s) => s.volume);
  const volumePoints = withReps.map((s) => point(s, s.volume?.volume ?? 0));
  const setPoints = inPeriod.map((s) => point(s, s.setCount));

  const records = exerciseRecords(stats);
  const trend = loadTrend(stats);
  const TrendIcon = TREND_ICON[trend.kind];

  const lateralIds = lateralSessionIds(sessions, exercise.id);
  const lateral =
    lateralIds.size > 0
      ? lateralInitialRepsMetric(stats.filter((s) => lateralIds.has(s.sessionId)))
      : null;

  const muscles = exercise.primaryMuscles.map((m) => MUSCLE_LABELS[m]).join(', ');

  return (
    <>
      <PageHeader title={exercise.name} backTo="/progresso" historyBack />
      <p className="-mt-3 mb-4 text-sm text-muted">
        {muscles} · {EQUIPMENT_LABELS[exercise.equipment]}
      </p>

      {stats.length === 0 ? (
        <div className="rounded-xl bg-surface p-6 text-center text-sm text-muted">
          Ainda sem registros deste exercício.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="flex items-center gap-2 rounded-xl bg-surface px-4 py-3 text-sm">
            <TrendIcon aria-hidden size={18} className="shrink-0 text-muted" />
            {trendText(trend)}
          </p>

          {lateral && lateral.points.length > 0 && (
            <section aria-labelledby="lateral-title" className="rounded-xl bg-surface p-4">
              <h2 id="lateral-title" className="text-sm font-semibold">
                Séries iniciais (1–3) na carga inicial
              </h2>
              <p className="text-xs text-muted">
                Soma das repetições por sessão, quando informadas.
              </p>
              <ol className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm num">
                {lateral.points.slice(-6).map((p) => (
                  <li key={p.sessionId}>
                    <span className="text-muted">{formatShortDate(p.date)}:</span> {p.repsSum}{' '}
                    <span className="text-muted">({formatKg(p.initialWeightKg)})</span>
                  </li>
                ))}
              </ol>
              {lateral.warn && (
                <p className="mt-3 flex items-start gap-2 rounded-lg bg-surface-2 px-3 py-2 text-sm">
                  <AlertTriangle aria-hidden size={16} className="mt-0.5 shrink-0" />
                  Sem progressão nas séries iniciais há {lateral.sessionsWithoutIncrease} sessões
                </p>
              )}
            </section>
          )}

          <Segmented label="Período" value={period} options={PERIODS} onChange={setPeriod} />

          <SessionChart
            title="Carga máxima por sessão"
            kind="line"
            unit="kg"
            points={weightPoints}
          />
          <SessionChart
            title="Volume de carga por sessão"
            kind="line"
            unit="kg"
            points={volumePoints}
            note={`Σ carga × repetições. Só sessões com repetições (${withReps.length} de ${inPeriod.length}).`}
          />
          <SessionChart
            title="Séries por sessão"
            kind="bar"
            unit="séries"
            points={setPoints}
            minPoints={1}
          />

          <section aria-labelledby="records-title" className="rounded-xl bg-surface p-4">
            <h2 id="records-title" className="mb-2 text-sm font-semibold">
              Recordes
            </h2>
            <dl className="grid gap-2 text-sm">
              <RecordRow
                label="Maior carga"
                value={records.maxWeight ? formatKg(records.maxWeight.weightKg) : undefined}
                date={records.maxWeight?.date}
              />
              <RecordRow
                label="Melhor série (carga × reps)"
                value={
                  records.bestSet
                    ? `${formatKg(records.bestSet.weightKg)} × ${records.bestSet.reps}`
                    : undefined
                }
                date={records.bestSet?.date}
              />
              <RecordRow
                label="Maior volume numa sessão"
                value={
                  records.maxSessionVolume ? formatKg(records.maxSessionVolume.volume) : undefined
                }
                date={records.maxSessionVolume?.date}
              />
            </dl>
          </section>

          <section aria-labelledby="sessions-title">
            <h2 id="sessions-title" className="mb-2 text-sm font-semibold text-muted">
              Sessões no período ({inPeriod.length})
            </h2>
            <ul className="flex flex-col gap-2">
              {[...inPeriod].reverse().map((s) => {
                const l = letter(s.sessionId);
                return (
                  <li key={s.sessionId}>
                    <Link
                      to={`/historico/${s.sessionId}`}
                      className={`flex min-h-14 items-center gap-3 rounded-xl border-l-4 bg-surface px-3 py-2 ${LETTER_STYLES[l].border}`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold">
                          {`${formatShortDate(s.date)} · Treino ${l}`}
                        </span>
                        <span className="block text-sm text-muted num">{describeSets(s.sets)}</span>
                      </span>
                      <ChevronRight aria-hidden size={18} className="text-muted" />
                    </Link>
                  </li>
                );
              })}
            </ul>
            {inPeriod.length < stats.length && (
              <p className="mt-2 text-xs text-muted">
                {stats.length - inPeriod.length}{' '}
                {plural(stats.length - inPeriod.length, 'sessão anterior', 'sessões anteriores')}{' '}
                fora do período.
              </p>
            )}
          </section>
        </div>
      )}
    </>
  );
}

function RecordRow({
  label,
  value,
  date,
}: {
  label: string;
  value?: string | undefined;
  date?: string | undefined;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right num">
        {value ? (
          <>
            <span className="font-semibold">{value}</span>
            {date && <span className="ml-2 text-xs text-muted">{formatShortDate(date)}</span>}
          </>
        ) : (
          <span className="text-muted">—</span>
        )}
      </dd>
    </div>
  );
}
