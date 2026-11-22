import type { Session, SetLog } from './types';

/** Séries de um exercício numa sessão, já ordenadas. */
export interface ExerciseSessionSets {
  session: Session;
  /** Ordenadas por setIndex (e completedAt como desempate). */
  sets: SetLog[];
}

function bySetOrder(a: SetLog, b: SetLog): number {
  return a.setIndex - b.setIndex || a.completedAt.localeCompare(b.completedAt);
}

/**
 * Histórico de um exercício em ordem cronológica (por início da sessão), independentemente do
 * template ou do slot em que foi feito. Ignora sessões descartadas e séries órfãs.
 */
export function exerciseHistory(
  exerciseId: string,
  sessions: readonly Session[],
  setLogs: readonly SetLog[],
  opts: { excludeSessionId?: string } = {},
): ExerciseSessionSets[] {
  const byId = new Map(sessions.map((s) => [s.id, s]));
  const grouped = new Map<string, SetLog[]>();
  for (const log of setLogs) {
    if (log.exerciseId !== exerciseId || log.sessionId === opts.excludeSessionId) continue;
    const session = byId.get(log.sessionId);
    if (!session || session.status === 'descartada') continue;
    const list = grouped.get(log.sessionId);
    if (list) list.push(log);
    else grouped.set(log.sessionId, [log]);
  }

  const out: ExerciseSessionSets[] = [];
  for (const [sessionId, sets] of grouped) {
    const session = byId.get(sessionId);
    if (session) out.push({ session, sets: sets.sort(bySetOrder) });
  }
  return out.sort((a, b) => a.session.startedAt.localeCompare(b.session.startedAt));
}
