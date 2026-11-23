import { applyCardioDraft, type CardioDraft } from '@/domain/cardio';
import { newId } from '@/lib/ids';
import { db } from './db';

/* Cardio avulso (SPEC §12.2): fora da rotação, sem sessão em andamento. */

/** Cria (sem `id`) ou atualiza. Devolve o id. O rascunho já deve estar validado. */
export async function saveCardio(draft: CardioDraft, id?: string): Promise<string> {
  const cardio = applyCardioDraft(id ?? newId(), draft);
  await db.cardio.put(cardio);
  return cardio.id;
}

export async function deleteCardio(id: string): Promise<void> {
  await db.cardio.delete(id);
}
