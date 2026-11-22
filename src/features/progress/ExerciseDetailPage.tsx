import { useLiveQuery } from 'dexie-react-hooks';
import {
  ChartLine,
  ChevronRight,
  Minus,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { PageHeader } from '@/components/PageHeader';
import { Segmented } from '@/components/PeriodFilter';
import { SessionChart, type ChartPoint } from '@/components/SessionChart';
import { LetterTile, Tile } from '@/components/Sign';
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

  if (data === undefined) return <p className="text-base text-muted">Carregando…</p>;
  if (data === null) {
    return (
      <>
        <PageHeader title="Exercício" backTo="/progresso" historyBack />
        <p className="text-base text-muted">Exercício não encontrado.</p>
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
      <PageHeader
        title={exercise.name}
        backTo="/progresso"
        historyBack
        subtitle={`${muscles} · ${EQUIPMENT_LABELS[exercise.equipment]}`}
      />

      {stats.length === 0 ? (
        <div className="flex items-start gap-3 border-y border-border py-4 text-base">
          <Tile icon={ChartLine} />
          <p className="pt-2.5 font-semibold">Ainda sem registros deste exercício.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <p className="-mx-4 flex min-h-16 items-center gap-3 bg-tile px-4 py-3 text-lg font-bold text-on-tile">
            <TrendIcon aria-hidden size={26} strokeWidth={2.5} className="shrink-0" />
            {trendText(trend)}
          </p>

          {lateral && lateral.points.length > 0 && (
            <section aria-labelledby="lateral-title">
              <h2 id="lateral-title" className="text-lg font-bold">
                Séries iniciais (1–3) na carga inicial
              </h2>
              <p className="mb-2 text-sm text-muted">
                Soma das repetições por sessão, quando informadas.
              </p>
              <ol className="rounded-[4px] border-2 border-edge bg-surface px-3 num">
                {lateral.points.slice(-6).map((p) => (
                  <li
                    key={p.sessionId}
                    className="flex min-h-12 items-center justify-between gap-3 border-b border-border text-base last:border-b-0"
                  >
                    <span className="text-muted">
                      {formatShortDate(p.date)} · {formatKg(p.initialWeightKg)}
                    </span>
                    <span className="text-xl font-bold">{p.repsSum}</span>
                  </li>
                ))}
              </ol>
              {lateral.warn && (
                <p className="mt-3 flex items-center gap-3 text-base font-semibold">
                  <Tile icon={TriangleAlert} size="sm" />
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

          <section aria-labelledby="records-title">
            <h2 id="records-title" className="mb-2 text-lg font-bold">
              Recordes
            </h2>
            <dl className="rounded-[4px] bg-tile px-4 py-1 text-on-tile">
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
            <h2 id="sessions-title" className="mb-1 text-lg font-bold">
              Sessões no período ({inPeriod.length})
            </h2>
            <ul className="rounded-[4px] border-2 border-edge bg-surface px-3">
              {[...inPeriod].reverse().map((s) => {
                const l = letter(s.sessionId);
                return (
                  <li key={s.sessionId} className="border-b border-border last:border-b-0">
                    <Link
                      to={`/historico/${s.sessionId}`}
                      className="flex min-h-16 items-center gap-3 py-2 hover:bg-surface-2"
                    >
                      <LetterTile letter={l} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-base font-bold">
                          {`${formatShortDate(s.date)} · Treino ${l}`}
                        </span>
                        <span className="block text-sm text-muted num">{describeSets(s.sets)}</span>
                      </span>
                      <ChevronRight aria-hidden size={22} className="text-muted" />
                    </Link>
                  </li>
                );
              })}
            </ul>
            {inPeriod.length < stats.length && (
              <p className="mt-2 text-sm text-muted">
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
    <div className="flex min-h-14 items-center justify-between gap-3 border-b border-white/15 last:border-b-0">
      <dt className="text-sm text-white/70">{label}</dt>
      <dd className="text-right num">
        {value ? (
          <>
            <span className="block text-lg leading-tight font-bold">{value}</span>
            {date && <span className="block text-xs text-white/70">{formatShortDate(date)}</span>}
          </>
        ) : (
          <span className="text-white/70">—</span>
        )}
      </dd>
    </div>
  );
}
