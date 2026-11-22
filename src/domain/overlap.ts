import { HOUR_MS } from '@/lib/dates';
import type { Exercise, MuscleGroup, Session, SetLog, WorkoutTemplate } from './types';

export type ExerciseMap = ReadonlyMap<string, Exercise>;

/** Grupos primários dos exercícios principais de um template (inclui slots opcionais). */
export function templatePrimaryMuscles(
  template: WorkoutTemplate,
  exercises: ExerciseMap,
): MuscleGroup[] {
  const out = new Set<MuscleGroup>();
  for (const slot of template.slots) {
    for (const m of exercises.get(slot.primaryExerciseId)?.primaryMuscles ?? []) out.add(m);
  }
  return [...out];
}

/** Grupos primários dos exercícios efetivamente executados (com ao menos uma série) na sessão. */
export function performedPrimaryMuscles(
  sessionId: string,
  setLogs: readonly SetLog[],
  exercises: ExerciseMap,
): Set<MuscleGroup> {
  const out = new Set<MuscleGroup>();
  for (const log of setLogs) {
    if (log.sessionId !== sessionId) continue;
    for (const m of exercises.get(log.exerciseId)?.primaryMuscles ?? []) out.add(m);
  }
  return out;
}

export interface OverlapInput {
  /** Grupos primários do treino sugerido. */
  muscles: readonly MuscleGroup[];
  sessions: readonly Session[];
  setLogs: readonly SetLog[];
  exercises: ExerciseMap;
  now: Date;
  windowHours?: number;
}

/**
 * Aviso de sobreposição (SPEC §5.1): grupos primários do treino sugerido que também foram
 * primários em exercícios executados numa sessão concluída nas últimas `windowHours` (24h).
 * Grupos secundários não contam. Retorna na ordem de `muscles`; vazio = sem aviso.
 */
export function overlapWarning({
  muscles,
  sessions,
  setLogs,
  exercises,
  now,
  windowHours = 24,
}: OverlapInput): MuscleGroup[] {
  const since = now.getTime() - windowHours * HOUR_MS;
  const recent = sessions.filter((s) => {
    if (s.status !== 'concluida' || !s.finishedAt) return false;
    const t = Date.parse(s.finishedAt);
    return t >= since && t <= now.getTime();
  });

  const worked = new Set<MuscleGroup>();
  for (const s of recent) {
    for (const m of performedPrimaryMuscles(s.id, setLogs, exercises)) worked.add(m);
  }
  return muscles.filter((m) => worked.has(m));
}
