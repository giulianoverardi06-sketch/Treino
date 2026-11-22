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
export function overlapWarning(input: OverlapInput): MuscleGroup[] {
  return overlapDetails(input).map((d) => d.muscle);
}

export interface OverlapDetail {
  muscle: MuscleGroup;
  /** Fim da sessão mais recente em que o grupo foi primário. */
  finishedAt: string;
}

/** Como `overlapWarning`, com o horário da sessão mais recente de cada grupo (para o texto). */
export function overlapDetails({
  muscles,
  sessions,
  setLogs,
  exercises,
  now,
  windowHours = 24,
}: OverlapInput): OverlapDetail[] {
  const since = now.getTime() - windowHours * HOUR_MS;
  const recent = sessions.filter((s) => {
    if (s.status !== 'concluida' || !s.finishedAt) return false;
    const t = Date.parse(s.finishedAt);
    return t >= since && t <= now.getTime();
  });

  const worked = new Map<MuscleGroup, string>();
  for (const s of recent) {
    const finishedAt = s.finishedAt ?? s.startedAt;
    for (const m of performedPrimaryMuscles(s.id, setLogs, exercises)) {
      const prev = worked.get(m);
      if (!prev || finishedAt > prev) worked.set(m, finishedAt);
    }
  }
  return muscles.flatMap((muscle) => {
    const finishedAt = worked.get(muscle);
    return finishedAt ? [{ muscle, finishedAt }] : [];
  });
}
