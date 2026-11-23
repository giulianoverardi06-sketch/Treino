import { calendarDaysBetween } from '@/lib/dates';
import { DEFAULT_ROTATION, type Letter, type Session } from './types';

export type NextWorkout =
  { kind: 'continue'; session: Session } | { kind: 'suggest'; letter: Letter; basedOn?: Session };

/**
 * Próxima letra da rotação depois de `letter`. `rotation` são as letras que existem no programa,
 * em ordem (A, B, C… até E). Se `letter` não existe mais, vale a próxima existente depois dela.
 */
export function nextLetter(letter: Letter, rotation: readonly Letter[] = DEFAULT_ROTATION): Letter {
  const sorted = [...rotation].sort();
  return sorted.find((l) => l > letter) ?? sorted[0] ?? 'A';
}

function latestByStart(sessions: readonly Session[]): Session | undefined {
  let latest: Session | undefined;
  for (const s of sessions) if (!latest || s.startedAt > latest.startedAt) latest = s;
  return latest;
}

/**
 * Sugestão do próximo treino (SPEC §5.1 e §12.1): sessão em andamento tem prioridade; senão, a
 * letra seguinte à última sessão concluída na rotação que existe (A→B→…→última→A); sem histórico,
 * a primeira letra. Descartadas não contam.
 */
export function nextWorkout(
  sessions: readonly Session[],
  rotation: readonly Letter[] = DEFAULT_ROTATION,
): NextWorkout {
  const inProgress = latestByStart(sessions.filter((s) => s.status === 'em_andamento'));
  if (inProgress) return { kind: 'continue', session: inProgress };

  const first = [...rotation].sort()[0] ?? 'A';
  const last = latestByStart(sessions.filter((s) => s.status === 'concluida'));
  if (!last) return { kind: 'suggest', letter: first };
  return { kind: 'suggest', letter: nextLetter(last.letter, rotation), basedOn: last };
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
