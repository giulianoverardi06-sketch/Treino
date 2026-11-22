import type { SetLog } from './types';

export interface LateralPoint {
  sessionId: string;
  date: string;
  initialWeightKg: number;
  /** Soma das repetições das séries 1–3. */
  repsSum: number;
}

export interface LateralMetric {
  points: LateralPoint[];
  /** Sessões seguidas, na mesma carga inicial, sem superar a melhor soma anterior. */
  sessionsWithoutIncrease: number;
  /** "Sem progressão nas séries iniciais há N sessões". */
  warn: boolean;
}

interface SessionSets {
  sessionId: string;
  date: string;
  /** Ordenadas por série. */
  sets: readonly SetLog[];
}

/** Soma das reps das séries 1–3 se as três estão na carga inicial e têm reps; senão `undefined`. */
export function initialRepsSum(sets: readonly SetLog[]): number | undefined {
  const first3 = sets.slice(0, 3);
  const initial = first3[0]?.weightKg;
  if (first3.length < 3 || initial === undefined) return undefined;
  let sum = 0;
  for (const s of first3) {
    if (s.weightKg !== initial || s.reps === undefined) return undefined;
    sum += s.reps;
  }
  return sum;
}

/**
 * Métrica do protocolo `drop_lateral` (SPEC §5.3), por sessão em ordem cronológica.
 *
 * Sessões sem a métrica (reps não informadas ou queda de carga antes da 3ª série) são ignoradas.
 * Uma sessão "sem aumento" é a que não supera a melhor soma já feita na mesma carga inicial.
 * Mudar a carga inicial reinicia a contagem (subir a carga já é progresso). Aviso a partir de
 * `threshold` (4) sessões seguidas sem aumento.
 */
export function lateralInitialRepsMetric(
  sessions: readonly SessionSets[],
  threshold = 4,
): LateralMetric {
  const points: LateralPoint[] = [];
  let best = -Infinity;
  let weight: number | undefined;
  let streak = 0;

  for (const s of sessions) {
    const repsSum = initialRepsSum(s.sets);
    const initialWeightKg = s.sets[0]?.weightKg;
    if (repsSum === undefined || initialWeightKg === undefined) continue;
    points.push({ sessionId: s.sessionId, date: s.date, initialWeightKg, repsSum });

    if (initialWeightKg !== weight) {
      weight = initialWeightKg;
      best = repsSum;
      streak = 0;
    } else if (repsSum > best) {
      best = repsSum;
      streak = 0;
    } else {
      streak++;
    }
  }

  return { points, sessionsWithoutIncrease: streak, warn: streak >= threshold };
}
