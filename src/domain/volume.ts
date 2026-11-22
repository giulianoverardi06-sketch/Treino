import type { SetLog } from './types';

type SetLike = Pick<SetLog, 'weightKg' | 'reps'>;

/** carga × repetições; `undefined` quando as repetições não foram informadas. */
export function setVolume(set: SetLike): number | undefined {
  return set.reps === undefined ? undefined : set.weightKg * set.reps;
}

export interface SessionVolume {
  /** Σ(carga × reps) das séries com repetições. */
  volume: number;
  setsWithReps: number;
  totalSets: number;
  /** Todas as séries tinham repetições. */
  complete: boolean;
}

/**
 * Volume de carga da sessão (SPEC §5.5). Séries sem repetições ficam de fora; se nenhuma série
 * tem repetições, retorna `null` (a sessão não entra no gráfico de volume).
 */
export function sessionVolume(sets: readonly SetLike[]): SessionVolume | null {
  let volume = 0;
  let setsWithReps = 0;
  for (const s of sets) {
    const v = setVolume(s);
    if (v === undefined) continue;
    volume += v;
    setsWithReps++;
  }
  if (setsWithReps === 0) return null;
  return { volume, setsWithReps, totalSets: sets.length, complete: setsWithReps === sets.length };
}

/** Maior carga entre as séries (considera todas, com ou sem repetições). */
export function maxWeight(sets: readonly SetLike[]): number | undefined {
  return sets.length ? Math.max(...sets.map((s) => s.weightKg)) : undefined;
}
