import { exerciseHistory, type ExerciseSessionSets } from './exerciseHistory';
import type { Session, SetLog } from './types';

/** Última vez que o exercício foi feito (em qualquer template/slot), exceto a sessão atual. */
export function lastPerformance(
  exerciseId: string,
  sessions: readonly Session[],
  setLogs: readonly SetLog[],
  excludeSessionId?: string,
): ExerciseSessionSets | undefined {
  const opts = excludeSessionId === undefined ? {} : { excludeSessionId };
  return exerciseHistory(exerciseId, sessions, setLogs, opts).at(-1);
}

export interface PrefillRow {
  setIndex: number;
  weightKg: number;
  toFailure: boolean;
  /** Repetições da mesma série na última vez, só como referência (o campo começa vazio). */
  lastReps?: number;
}

export interface PrefillInput {
  exerciseId: string;
  plannedSets: number;
  sessions: readonly Session[];
  setLogs: readonly SetLog[];
  defaultToFailure: boolean;
  /** Carga quando o exercício nunca foi feito (ex.: `slot.startWeightKg`). Padrão: 0. */
  fallbackWeightKg?: number;
  /** A sessão em andamento, para não usar a si mesma como referência. */
  excludeSessionId?: string;
}

/**
 * Linhas de série pré-preenchidas (SPEC §5.2): a carga da mesma série na última sessão daquele
 * **exercício**. Se a última sessão teve menos séries, repete a carga da última série dela.
 * Repetições não são pré-preenchidas; falha vem de `defaultToFailure`.
 */
export function prefillFromLastSession(input: PrefillInput): PrefillRow[] {
  const last = lastPerformance(
    input.exerciseId,
    input.sessions,
    input.setLogs,
    input.excludeSessionId,
  );
  const sets = last?.sets ?? [];
  const fallback = input.fallbackWeightKg ?? 0;

  return Array.from({ length: input.plannedSets }, (_, i) => {
    const same = sets[i];
    const source = same ?? sets.at(-1);
    const row: PrefillRow = {
      setIndex: i + 1,
      weightKg: source?.weightKg ?? fallback,
      toFailure: input.defaultToFailure,
    };
    if (same?.reps !== undefined) row.lastReps = same.reps;
    return row;
  });
}
