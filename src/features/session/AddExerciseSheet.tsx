import { ExercisePicker } from '@/components/ExercisePicker';
import { Modal } from '@/components/Modal';
import type { Exercise } from '@/domain/types';

interface AddExerciseSheetProps {
  exercises: ReadonlyMap<string, Exercise>;
  onPick: (exerciseId: string) => void;
  onClose: () => void;
}

export function AddExerciseSheet({ exercises, onPick, onClose }: AddExerciseSheetProps) {
  return (
    <Modal title="Adicionar exercício" onClose={onClose}>
      <ExercisePicker exercises={exercises} onPick={onPick} />
    </Modal>
  );
}
