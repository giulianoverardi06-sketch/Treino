import { calendarDaysBetween } from '@/lib/dates';
import type { ExerciseMap } from './overlap';
import type { ExerciseSessionStat } from './records';
import type { MuscleGroup, Session, SetLog } from './types';

export type Period = '30d' | '90d' | '1y' | 'all';

const PERIOD_DAYS: Record<Exclude<Period, 'all'>, number> = { '30d': 30, '90d': 90, '1y': 365 };

/** Mantém o que cai no período (dias de calendário, hoje incluído). */
export function filterByPeriod<T extends { date: string }>(
  items: readonly T[],
  period: Period,
  now: Date,
): T[] {
  if (period === 'all') return [...items];
  const days = PERIOD_DAYS[period];
  return items.filter((i) => {
    const d = calendarDaysBetween(i.date, now);
    return d >= 0 && d < days;
  });
}

export type Trend =
  | { kind: 'insufficient' }
  | { kind: 'up' | 'down'; deltaKg: number; sessions: number }
  | { kind: 'stable'; weightKg: number; sessions: number };

/**
 * Indicador de tendência da carga máxima (SPEC §5.5), só descritivo.
 * - Se a carga máxima está igual nas últimas 3+ sessões → estável há N sessões.
 * - Senão compara a última sessão com a primeira da janela (até `window` sessões).
 */
export function loadTrend(stats: readonly ExerciseSessionStat[], window = 5): Trend {
  if (stats.length < 2) return { kind: 'insufficient' };
  const weights = stats.map((s) => s.maxWeightKg);
  const last = weights.at(-1) ?? 0;

  let stable = 0;
  for (let i = weights.length - 1; i >= 0 && weights[i] === last; i--) stable++;
  if (stable >= 3) return { kind: 'stable', weightKg: last, sessions: stable };

  const slice = weights.slice(-window);
  const first = slice[0] ?? last;
  const delta = Math.round((last - first) * 100) / 100;
  if (delta === 0) return { kind: 'stable', weightKg: last, sessions: stable };
  return { kind: delta > 0 ? 'up' : 'down', deltaKg: Math.abs(delta), sessions: slice.length };
}

/**
 * Séries por grupo muscular nos últimos `days` dias (SPEC §5.5): só sessões concluídas e só
 * `primaryMuscles` — uma série de um exercício com dois primários conta para os dois.
 */
export function setsByMuscle(
  sessions: readonly Session[],
  setLogs: readonly SetLog[],
  exercises: ExerciseMap,
  now: Date,
  days: number,
): Map<MuscleGroup, number> {
  const inWindow = new Set(
    sessions
      .filter((s) => {
        if (s.status !== 'concluida') return false;
        const d = calendarDaysBetween(s.startedAt, now);
        return d >= 0 && d < days;
      })
      .map((s) => s.id),
  );
  const counts = new Map<MuscleGroup, number>();
  for (const log of setLogs) {
    if (!inWindow.has(log.sessionId)) continue;
    for (const m of exercises.get(log.exerciseId)?.primaryMuscles ?? []) {
      counts.set(m, (counts.get(m) ?? 0) + 1);
    }
  }
  return counts;
}

export const PUSH_MUSCLES: readonly MuscleGroup[] = [
  'peito',
  'peito_superior',
  'deltoide_anterior',
  'triceps',
];
export const PULL_MUSCLES: readonly MuscleGroup[] = [
  'dorsais',
  'costas_medias',
  'deltoide_posterior',
  'biceps',
];

export interface PushPull {
  push: number;
  pull: number;
  /** empurrar ÷ puxar; `null` se não houve séries de puxar. */
  ratio: number | null;
}

/** Equilíbrio empurrar/puxar (SPEC §5.5), informativo. Peito superior conta como peito. */
export function pushPullBalance(counts: ReadonlyMap<MuscleGroup, number>): PushPull {
  const sum = (ms: readonly MuscleGroup[]) => ms.reduce((acc, m) => acc + (counts.get(m) ?? 0), 0);
  const push = sum(PUSH_MUSCLES);
  const pull = sum(PULL_MUSCLES);
  return { push, pull, ratio: pull === 0 ? null : Math.round((push / pull) * 100) / 100 };
}

/** Sessões em que a entrada do exercício seguiu o protocolo `drop_lateral`. */
export function lateralSessionIds(sessions: readonly Session[], exerciseId: string): Set<string> {
  return new Set(
    sessions
      .filter((s) =>
        s.entries.some((e) => e.exerciseId === exerciseId && e.protocol === 'drop_lateral'),
      )
      .map((s) => s.id),
  );
}
