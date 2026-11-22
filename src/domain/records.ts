import { exerciseHistory } from './exerciseHistory';
import type { Session, SetLog } from './types';
import { maxWeight, sessionVolume, setVolume, type SessionVolume } from './volume';

export interface ExerciseSessionStat {
  sessionId: string;
  /** Início da sessão (ISO). */
  date: string;
  sets: SetLog[];
  maxWeightKg: number;
  volume: SessionVolume | null;
  /** Séries registradas na sessão. */
  setCount: number;
  /** Séries marcadas como falha. */
  failureSets: number;
}

/** Uma linha por sessão em que o exercício foi feito, em ordem cronológica (base dos gráficos). */
export function exerciseSessionStats(
  exerciseId: string,
  sessions: readonly Session[],
  setLogs: readonly SetLog[],
): ExerciseSessionStat[] {
  return exerciseHistory(exerciseId, sessions, setLogs).map(({ session, sets }) => ({
    sessionId: session.id,
    date: session.startedAt,
    sets,
    maxWeightKg: maxWeight(sets) ?? 0,
    volume: sessionVolume(sets),
    setCount: sets.length,
    failureSets: sets.filter((s) => s.toFailure).length,
  }));
}

interface RecordBase {
  sessionId: string;
  date: string;
}

export interface ExerciseRecords {
  /** Maior carga numa série (considera todas as séries). */
  maxWeight: (RecordBase & { weightKg: number }) | null;
  /** Maior carga × repetições numa única série (só séries com repetições). */
  bestSet: (RecordBase & { weightKg: number; reps: number; product: number }) | null;
  /** Maior volume numa sessão (só séries com repetições). */
  maxSessionVolume: (RecordBase & { volume: number }) | null;
}

/**
 * Recordes do exercício (SPEC §5.5). Em empate vale a primeira vez que a marca foi atingida.
 * `stats` deve estar em ordem cronológica (como sai de `exerciseSessionStats`).
 */
export function exerciseRecords(stats: readonly ExerciseSessionStat[]): ExerciseRecords {
  const records: ExerciseRecords = { maxWeight: null, bestSet: null, maxSessionVolume: null };

  for (const stat of stats) {
    const base = { sessionId: stat.sessionId, date: stat.date };

    if (stat.sets.length && (!records.maxWeight || stat.maxWeightKg > records.maxWeight.weightKg)) {
      records.maxWeight = { ...base, weightKg: stat.maxWeightKg };
    }

    for (const set of stat.sets) {
      const product = setVolume(set);
      if (product === undefined || set.reps === undefined) continue;
      if (!records.bestSet || product > records.bestSet.product) {
        records.bestSet = { ...base, weightKg: set.weightKg, reps: set.reps, product };
      }
    }

    if (
      stat.volume &&
      (!records.maxSessionVolume || stat.volume.volume > records.maxSessionVolume.volume)
    ) {
      records.maxSessionVolume = { ...base, volume: stat.volume.volume };
    }
  }
  return records;
}
