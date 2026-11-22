import { exerciseRecords, exerciseSessionStats } from './records';
import type { Session, SetLog } from './types';

export type RecordKind = 'maxWeight' | 'bestSet' | 'maxSessionVolume';

export interface BrokenRecord {
  exerciseId: string;
  kinds: RecordKind[];
}

/**
 * Recordes batidos na sessão: compara cada exercício feito com o histórico anterior a ela.
 * Só conta quando já existia a marca anterior (a primeira vez não é "recorde").
 */
export function recordsBrokenInSession(
  sessionId: string,
  sessions: readonly Session[],
  setLogs: readonly SetLog[],
): BrokenRecord[] {
  const session = sessions.find((s) => s.id === sessionId);
  if (!session) return [];

  const exerciseIds = [
    ...new Set(setLogs.filter((l) => l.sessionId === sessionId).map((l) => l.exerciseId)),
  ];
  // A própria sessão entra no cálculo mesmo se ainda estiver em andamento.
  const asConcluded = sessions.map((s) =>
    s.id === sessionId ? { ...s, status: 'concluida' as const } : s,
  );

  const out: BrokenRecord[] = [];
  for (const exerciseId of exerciseIds) {
    const stats = exerciseSessionStats(exerciseId, asConcluded, setLogs);
    const current = stats.find((s) => s.sessionId === sessionId);
    const prior = exerciseRecords(stats.filter((s) => s.date < session.startedAt));
    if (!current) continue;
    const now = exerciseRecords([current]);

    const kinds: RecordKind[] = [];
    if (prior.maxWeight && now.maxWeight && now.maxWeight.weightKg > prior.maxWeight.weightKg) {
      kinds.push('maxWeight');
    }
    if (prior.bestSet && now.bestSet && now.bestSet.product > prior.bestSet.product) {
      kinds.push('bestSet');
    }
    if (
      prior.maxSessionVolume &&
      now.maxSessionVolume &&
      now.maxSessionVolume.volume > prior.maxSessionVolume.volume
    ) {
      kinds.push('maxSessionVolume');
    }
    if (kinds.length) out.push({ exerciseId, kinds });
  }
  return out;
}

export interface SessionSummary {
  /** Entradas com ao menos uma série registrada. */
  exercisesDone: number;
  totalSets: number;
  records: BrokenRecord[];
}

export function summarizeSession(
  session: Session,
  sessions: readonly Session[],
  setLogs: readonly SetLog[],
): SessionSummary {
  const own = setLogs.filter((l) => l.sessionId === session.id);
  return {
    exercisesDone: new Set(own.map((l) => l.entryId)).size,
    totalSets: own.length,
    records: recordsBrokenInSession(session.id, sessions, setLogs),
  };
}
