import { Dumbbell } from 'lucide-react';
import { MUSCLE_LABELS } from '@/domain/labels';
import type { Exercise } from '@/domain/types';

interface ExerciseImageProps {
  exercise: Exercise | undefined;
  size: 'thumb' | 'large';
}

/**
 * Imagem de referência do exercício. Por enquanto só o placeholder com o grupo muscular;
 * as fotos (free-exercise-db e upload) entram na Fase 7.
 */
export function ExerciseImage({ exercise, size }: ExerciseImageProps) {
  const muscle = exercise?.primaryMuscles[0];
  if (size === 'thumb') {
    return (
      <div
        aria-hidden
        className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-muted"
      >
        <Dumbbell size={22} />
      </div>
    );
  }
  return (
    <div
      role="img"
      aria-label={`Sem imagem${muscle ? ` · ${MUSCLE_LABELS[muscle]}` : ''}`}
      className="flex h-32 flex-col items-center justify-center gap-1 rounded-xl bg-surface-2 text-muted"
    >
      <Dumbbell aria-hidden size={32} />
      {muscle && <span className="text-xs">{MUSCLE_LABELS[muscle]}</span>}
    </div>
  );
}
