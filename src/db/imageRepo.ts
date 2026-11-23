import type { ExerciseDbEntry } from '@/domain/exerciseDb';
import type { Exercise, ImageSource } from '@/domain/types';
import { newId } from '@/lib/ids';
import { exerciseDbRawUrl, resizeImage } from '@/lib/images';
import { db } from './db';

/*
 * Imagens próprias e baixadas ficam na tabela `images` (blob JPEG). O exercício aponta para elas
 * com `imageSource: { kind: 'custom', blobId, altBlobId? }`. Ao trocar ou remover, os blobs
 * antigos são apagados.
 */

export class ImageError extends Error {}

function ownedBlobIds(source: ImageSource): string[] {
  if (source.kind !== 'custom') return [];
  return source.altBlobId ? [source.blobId, source.altBlobId] : [source.blobId];
}

/** Grava as fotos (1 ou 2) e aponta o exercício para elas, apagando as anteriores. */
export async function setExerciseImages(exerciseId: string, blobs: readonly Blob[]): Promise<void> {
  const [first, second] = blobs;
  if (!first) throw new ImageError('Nenhuma imagem');
  await db.transaction('rw', db.exercises, db.images, async () => {
    const exercise = await db.exercises.get(exerciseId);
    if (!exercise) throw new ImageError('Exercício não encontrado');
    const ids = [newId(), ...(second ? [newId()] : [])];
    await db.images.bulkAdd(
      [first, second]
        .filter((b): b is Blob => b !== undefined)
        .map((blob, i) => ({ id: ids[i] ?? newId(), blob, mime: blob.type || 'image/jpeg' })),
    );
    const source: Exercise['imageSource'] = second
      ? { kind: 'custom', blobId: ids[0] ?? '', altBlobId: ids[1] ?? '' }
      : { kind: 'custom', blobId: ids[0] ?? '' };
    await db.images.bulkDelete(ownedBlobIds(exercise.imageSource));
    await db.exercises.update(exerciseId, { imageSource: source });
  });
}

/** Foto própria (câmera ou galeria), reduzida para 800px em JPEG 0.8. */
export async function uploadExerciseImage(exerciseId: string, file: Blob): Promise<void> {
  if (!file.type.startsWith('image/')) throw new ImageError('O arquivo não é uma imagem.');
  await setExerciseImages(exerciseId, [await resizeImage(file)]);
}

/** Baixa as duas fotos do banco aberto (exige conexão) e guarda no aparelho. */
export async function importFromExerciseDb(
  exerciseId: string,
  entry: Pick<ExerciseDbEntry, 'images'>,
): Promise<void> {
  const paths = entry.images.slice(0, 2);
  if (paths.length === 0) throw new ImageError('Esse exercício não tem imagem no banco aberto.');
  let blobs: Blob[];
  try {
    blobs = await Promise.all(
      paths.map(async (path) => {
        const res = await fetch(exerciseDbRawUrl(path));
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return resizeImage(await res.blob());
      }),
    );
  } catch {
    throw new ImageError('Não foi possível baixar a imagem. Confira a conexão e tente de novo.');
  }
  await setExerciseImages(exerciseId, blobs);
}

/** Volta para "sem imagem" e apaga as fotos guardadas. */
export async function removeExerciseImage(exerciseId: string): Promise<void> {
  await db.transaction('rw', db.exercises, db.images, async () => {
    const exercise = await db.exercises.get(exerciseId);
    if (!exercise) return;
    await db.images.bulkDelete(ownedBlobIds(exercise.imageSource));
    await db.exercises.update(exerciseId, { imageSource: { kind: 'none' } });
  });
}
