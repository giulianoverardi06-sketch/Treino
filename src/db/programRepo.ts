import {
  applyExerciseDraft,
  deletionPolicy,
  exerciseUsage,
  type ExerciseDraft,
} from '@/domain/program';
import type { Exercise, Slot, WorkoutTemplate } from '@/domain/types';
import { newId } from '@/lib/ids';
import { db } from './db';

/*
 * Edição do programa e da biblioteca. Mudanças no template não tocam sessões passadas: cada sessão
 * guarda um snapshot das entradas e as séries apontam para o exercício, não para o slot.
 */

const nowIso = () => new Date().toISOString();

export class ProgramError extends Error {}

export async function updateTemplate(
  templateId: string,
  patch: Partial<Pick<WorkoutTemplate, 'name' | 'emphasis' | 'slots'>>,
): Promise<void> {
  await db.transaction('rw', db.templates, async () => {
    const template = await db.templates.get(templateId);
    if (!template) throw new ProgramError('Treino não encontrado');
    const next: WorkoutTemplate = { ...template, ...patch, updatedAt: nowIso() };
    if (patch.name !== undefined) next.name = patch.name.trim() || template.name;
    if (patch.emphasis !== undefined) next.emphasis = patch.emphasis.trim();
    await db.templates.put(next);
  });
}

/** Troca a lista de slots inteira (reordenar, adicionar, remover, editar um). */
export async function saveSlots(templateId: string, slots: Slot[]): Promise<void> {
  await updateTemplate(templateId, { slots });
}

export async function exerciseHasHistory(exerciseId: string): Promise<boolean> {
  return (await db.setLogs.where('exerciseId').equals(exerciseId).count()) > 0;
}

/** Cria (sem `id`) ou atualiza um exercício. Devolve o id. */
export async function saveExercise(draft: ExerciseDraft, id?: string): Promise<string> {
  return db.transaction('rw', db.exercises, async () => {
    const existing = id ? await db.exercises.get(id) : undefined;
    if (id && !existing) throw new ProgramError('Exercício não encontrado');
    const exercise: Exercise = applyExerciseDraft(
      existing ?? {
        id: newId(),
        imageSource: { kind: 'none' },
        archived: false,
        createdAt: nowIso(),
      },
      draft,
    );
    await db.exercises.put(exercise);
    return exercise.id;
  });
}

export async function setExerciseArchived(exerciseId: string, archived: boolean): Promise<void> {
  await db.exercises.update(exerciseId, { archived });
}

/** Exclui só se nunca foi registrado e não está no programa (senão, arquivar). */
export async function deleteExercise(exerciseId: string): Promise<void> {
  await db.transaction('rw', db.exercises, db.templates, db.setLogs, async () => {
    const templates = await db.templates.toArray();
    const policy = deletionPolicy(
      await exerciseHasHistory(exerciseId),
      exerciseUsage(exerciseId, templates),
    );
    if (!policy.canDelete) throw new ProgramError(policy.reason ?? 'Não é possível excluir');
    await db.exercises.delete(exerciseId);
  });
}
