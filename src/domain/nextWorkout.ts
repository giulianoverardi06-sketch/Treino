import { calendarDaysBetween } from '@/lib/dates';
import type { Letter, Session } from './types';

export type NextWorkout =
  { kind: 'continue'; session: Session } | { kind: 'suggest'; letter: Letter; basedOn?: Session };

const CYCLE: Record<Letter, Letter> = { A: 'B', B: 'C', C: 'A' };

export function nextLetter(letter: Letter): Letter {
  return CYCLE[letter];
}

function latestByStart(sessions: readonly Session[]): Session | undefined {
  let latest: Session | undefined;
  for (const s of sessions) if (!latest || s.startedAt > latest.startedAt) latest = s;
  return latest;
}

/**
 * Sugestão do próximo treino (SPEC §5.1): sessão em andamento tem prioridade; senão, a letra
 * seguinte à última sessão concluída no ciclo A→B→C→A; sem histórico, A. Descartadas não contam.
 */
export function nextWorkout(sessions: readonly Session[]): NextWorkout {
  const inProgress = latestByStart(sessions.filter((s) => s.status === 'em_andamento'));
  if (inProgress) return { kind: 'continue', session: inProgress };

  const last = latestByStart(sessions.filter((s) => s.status === 'concluida'));
  if (!last) return { kind: 'suggest', letter: 'A' };
  return { kind: 'suggest', letter: nextLetter(last.letter), basedOn: last };
}

/** Última sessão concluída de uma letra. */
export function lastSessionOfLetter(
  sessions: readonly Session[],
  letter: Letter,
): Session | undefined {
  return latestByStart(sessions.filter((s) => s.status === 'concluida' && s.letter === letter));
}

/** Dias desde a última sessão concluída da letra, ou `undefined` se nunca foi feita. */
export function daysSinceLetter(
  sessions: readonly Session[],
  letter: Letter,
  now: Date,
): number | undefined {
  const last = lastSessionOfLetter(sessions, letter);
  return last ? calendarDaysBetween(last.finishedAt ?? last.startedAt, now) : undefined;
}
