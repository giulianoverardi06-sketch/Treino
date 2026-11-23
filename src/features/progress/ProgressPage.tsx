import { useLiveQuery } from 'dexie-react-hooks';
import { ChartLine, ChevronRight, HeartPulse } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { PageHeader } from '@/components/PageHeader';
import { Segmented } from '@/components/PeriodFilter';
import { Tile } from '@/components/Sign';
import { db } from '@/db/db';
import { cardioTotals } from '@/domain/cardio';
import { MUSCLE_LABELS } from '@/domain/labels';
import { exerciseHistory } from '@/domain/exerciseHistory';
import { pushPullBalance, setsByMuscle } from '@/domain/progress';
import type { MuscleGroup } from '@/domain/types';
import { describeSets, formatDuration, formatNumber, formatShortDate, plural } from '@/lib/format';

const WINDOWS = [
  { value: '7', label: '7 dias' },
  { value: '30', label: '30 dias' },
] as const;
type Window = (typeof WINDOWS)[number]['value'];

export function ProgressPage() {
  const [windowDays, setWindowDays] = useState<Window>('7');
  const data = useLiveQuery(async () => {
    const [sessions, setLogs, exercises, cardio] = await Promise.all([
      db.sessions.where('status').equals('concluida').toArray(),
      db.setLogs.toArray(),
      db.exercises.toArray(),
      db.cardio.toArray(),
    ]);
    return {
      now: new Date(),
      sessions,
      cardio,
      setLogs,
      exercises: new Map(exercises.map((e) => [e.id, e])),
    };
  });

  if (data === undefined) {
    return (
      <>
        <PageHeader title="Progresso" />
        <p className="text-base text-muted">Carregando…</p>
      </>
    );
  }

  const counts = setsByMuscle(
    data.sessions,
    data.setLogs,
    data.exercises,
    data.now,
    Number(windowDays),
  );
  const rows = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...rows.map(([, n]) => n));
  const balance = pushPullBalance(counts);
  const cardio = cardioTotals(data.cardio, data.now, Number(windowDays));

  // Exercícios com histórico, do feito mais recentemente para o mais antigo.
  const doneIds = [...new Set(data.setLogs.map((l) => l.exerciseId))];
  const exercises = doneIds
    .flatMap((id) => {
      const last = exerciseHistory(id, data.sessions, data.setLogs).at(-1);
      const exercise = data.exercises.get(id);
      return last && exercise ? [{ exercise, last }] : [];
    })
    .sort((a, b) => b.last.session.startedAt.localeCompare(a.last.session.startedAt));

  return (
    <>
      <PageHeader title="Progresso" />
      {data.sessions.length === 0 && data.cardio.length === 0 ? (
        <div className="flex items-start gap-3 border-y border-border py-4 text-base">
          <Tile icon={ChartLine} />
          <div className="pt-1">
            <p className="font-semibold">Sem treinos concluídos ainda.</p>
            <p className="text-muted">A visão geral aparece depois da primeira sessão.</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          <Segmented label="Janela" value={windowDays} options={WINDOWS} onChange={setWindowDays} />

          <section aria-labelledby="muscles-title">
            <h2 id="muscles-title" className="text-lg font-bold">
              Séries por grupo muscular
            </h2>
            <p className="mb-3 text-sm text-muted">Só músculos primários de cada exercício.</p>
            {rows.length === 0 ? (
              <p className="rounded-[4px] border-2 border-edge bg-surface px-3 py-4 text-base text-muted">
                Nenhuma série no período.
              </p>
            ) : (
              <ul className="rounded-[4px] border-2 border-edge bg-surface px-3">
                {rows.map(([muscle, n]) => (
                  <MuscleBar key={muscle} muscle={muscle} value={n} max={max} />
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="balance-title">
            <h2 id="balance-title" className="text-lg font-bold">
              Equilíbrio empurrar / puxar
            </h2>
            <p className="mb-3 text-sm text-muted">
              Empurrar: peito, deltoide anterior, tríceps. Puxar: dorsais, costas médias, deltoide
              posterior, bíceps.
            </p>
            <div className="rounded-[4px] bg-tile px-4 py-3 text-on-tile">
              <dl className="grid grid-cols-3 divide-x divide-white/15 num">
                <div className="pr-3">
                  <dt className="text-sm text-white/70">Empurrar</dt>
                  <dd className="text-[1.75rem] leading-tight font-bold">{balance.push}</dd>
                </div>
                <div className="px-3">
                  <dt className="text-sm text-white/70">Puxar</dt>
                  <dd className="text-[1.75rem] leading-tight font-bold">{balance.pull}</dd>
                </div>
                <div className="pl-3">
                  <dt className="text-sm text-white/70">Razão</dt>
                  <dd className="text-[1.75rem] leading-tight font-bold">
                    {balance.ratio === null ? '—' : formatNumber(balance.ratio)}
                  </dd>
                </div>
              </dl>
              {balance.push + balance.pull > 0 && (
                <div className="mt-3 flex h-3 gap-0.5" aria-hidden>
                  <span
                    className="rounded-l-[2px] bg-letter-a"
                    style={{ flexGrow: balance.push }}
                  />
                  <span
                    className="rounded-r-[2px] bg-letter-b"
                    style={{ flexGrow: balance.pull }}
                  />
                </div>
              )}
            </div>
          </section>

          <section aria-labelledby="cardio-title">
            <h2 id="cardio-title" className="mb-3 text-lg font-bold">
              Cardio
            </h2>
            <div className="flex items-center gap-4 rounded-[4px] border-2 border-edge bg-surface px-3 py-3">
              <Tile icon={HeartPulse} />
              {cardio.count === 0 ? (
                <p className="text-base text-muted">Nenhum cardio no período.</p>
              ) : (
                <dl className="grid flex-1 grid-cols-3 divide-x divide-border num">
                  <div className="pr-3">
                    <dt className="text-sm text-muted">Tempo</dt>
                    <dd className="text-xl leading-tight font-bold">
                      {formatDuration(cardio.minutes)}
                    </dd>
                  </div>
                  <div className="px-3">
                    <dt className="text-sm text-muted">Distância</dt>
                    <dd className="text-xl leading-tight font-bold">
                      {cardio.km > 0 ? `${formatNumber(cardio.km)} km` : '—'}
                    </dd>
                  </div>
                  <div className="pl-3">
                    <dt className="text-sm text-muted">Sessões</dt>
                    <dd className="text-xl leading-tight font-bold">{cardio.count}</dd>
                  </div>
                </dl>
              )}
            </div>
          </section>

          <section aria-labelledby="exercises-title" hidden={exercises.length === 0}>
            <h2 id="exercises-title" className="mb-1 text-lg font-bold">
              Exercícios
            </h2>
            <ul className="rounded-[4px] border-2 border-edge bg-surface px-3">
              {exercises.map(({ exercise, last }) => (
                <li key={exercise.id} className="border-b border-border last:border-b-0">
                  <Link
                    to={`/exercicio/${exercise.id}`}
                    className="flex min-h-16 items-center gap-3 py-2 hover:bg-surface-2"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-lg leading-tight font-bold">
                        {exercise.name}
                      </span>
                      <span className="block truncate text-sm text-muted num">
                        {`${formatShortDate(last.session.startedAt)} · ${describeSets(last.sets)}`}
                      </span>
                    </span>
                    <ChevronRight aria-hidden size={22} className="text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </>
  );
}

function MuscleBar({ muscle, value, max }: { muscle: MuscleGroup; value: number; max: number }) {
  return (
    <li className="grid min-h-12 grid-cols-[7.5rem_1fr_2.25rem] items-center gap-3 border-b border-border text-base last:border-b-0">
      <span className="truncate font-semibold">{MUSCLE_LABELS[muscle]}</span>
      <span className="h-3 rounded-[2px] bg-surface-2" aria-hidden>
        <span
          className="block h-full rounded-[2px] bg-text"
          style={{ width: `${(value / max) * 100}%` }}
        />
      </span>
      <span className="text-right text-lg font-bold num">
        {value}
        <span className="sr-only"> {plural(value, 'série', 'séries')}</span>
      </span>
    </li>
  );
}
