import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { PageHeader } from '@/components/PageHeader';
import { Segmented } from '@/components/PeriodFilter';
import { db } from '@/db/db';
import { MUSCLE_LABELS } from '@/domain/labels';
import { exerciseHistory } from '@/domain/exerciseHistory';
import { pushPullBalance, setsByMuscle } from '@/domain/progress';
import type { MuscleGroup } from '@/domain/types';
import { describeSets, formatNumber, formatShortDate, plural } from '@/lib/format';

const WINDOWS = [
  { value: '7', label: '7 dias' },
  { value: '30', label: '30 dias' },
] as const;
type Window = (typeof WINDOWS)[number]['value'];

export function ProgressPage() {
  const [windowDays, setWindowDays] = useState<Window>('7');
  const data = useLiveQuery(async () => {
    const [sessions, setLogs, exercises] = await Promise.all([
      db.sessions.where('status').equals('concluida').toArray(),
      db.setLogs.toArray(),
      db.exercises.toArray(),
    ]);
    return {
      now: new Date(),
      sessions,
      setLogs,
      exercises: new Map(exercises.map((e) => [e.id, e])),
    };
  });

  if (data === undefined) {
    return (
      <>
        <PageHeader title="Progresso" />
        <p className="text-sm text-muted">Carregando…</p>
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
      {data.sessions.length === 0 ? (
        <div className="rounded-xl bg-surface p-6 text-center text-sm text-muted">
          <p>Sem treinos concluídos ainda.</p>
          <p className="mt-1">A visão geral aparece depois da primeira sessão.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <Segmented label="Janela" value={windowDays} options={WINDOWS} onChange={setWindowDays} />

          <section aria-labelledby="muscles-title" className="rounded-xl bg-surface p-4">
            <h2 id="muscles-title" className="text-sm font-semibold">
              Séries por grupo muscular
            </h2>
            <p className="mb-3 text-xs text-muted">Só músculos primários de cada exercício.</p>
            {rows.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted">Nenhuma série no período.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {rows.map(([muscle, n]) => (
                  <MuscleBar key={muscle} muscle={muscle} value={n} max={max} />
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="balance-title" className="rounded-xl bg-surface p-4">
            <h2 id="balance-title" className="text-sm font-semibold">
              Equilíbrio empurrar / puxar
            </h2>
            <p className="mb-3 text-xs text-muted">
              Empurrar: peito, deltoide anterior, tríceps. Puxar: dorsais, costas médias, deltoide
              posterior, bíceps.
            </p>
            <dl className="grid grid-cols-3 gap-2 num">
              <div>
                <dt className="text-xs text-muted">Empurrar</dt>
                <dd className="text-xl font-semibold">{balance.push}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Puxar</dt>
                <dd className="text-xl font-semibold">{balance.pull}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Razão</dt>
                <dd className="text-xl font-semibold">
                  {balance.ratio === null ? '—' : formatNumber(balance.ratio)}
                </dd>
              </div>
            </dl>
            {balance.push + balance.pull > 0 && (
              <div className="mt-3 flex h-2 gap-0.5" aria-hidden>
                <span className="rounded-l-full bg-letter-a" style={{ flexGrow: balance.push }} />
                <span className="rounded-r-full bg-letter-b" style={{ flexGrow: balance.pull }} />
              </div>
            )}
          </section>

          <section aria-labelledby="exercises-title">
            <h2 id="exercises-title" className="mb-2 text-sm font-semibold text-muted">
              Exercícios
            </h2>
            <ul className="flex flex-col gap-2">
              {exercises.map(({ exercise, last }) => (
                <li key={exercise.id}>
                  <Link
                    to={`/exercicio/${exercise.id}`}
                    className="flex min-h-14 items-center gap-3 rounded-xl bg-surface px-3 py-2"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{exercise.name}</span>
                      <span className="block truncate text-sm text-muted num">
                        {`${formatShortDate(last.session.startedAt)} · ${describeSets(last.sets)}`}
                      </span>
                    </span>
                    <ChevronRight aria-hidden size={18} className="text-muted" />
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
    <li className="grid grid-cols-[7.5rem_1fr_2rem] items-center gap-2 text-sm">
      <span className="truncate">{MUSCLE_LABELS[muscle]}</span>
      <span className="h-2 rounded-full bg-surface-2" aria-hidden>
        <span
          className="block h-full rounded-full bg-muted"
          style={{ width: `${(value / max) * 100}%` }}
        />
      </span>
      <span className="text-right font-semibold num">
        {value}
        <span className="sr-only"> {plural(value, 'série', 'séries')}</span>
      </span>
    </li>
  );
}
