/** Imagens de exercício: URLs locais/remotas do free-exercise-db e redimensionamento no cliente. */

export const EXERCISE_DB_RAW =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises';

/** Fotos do seed, servidas (e pré-cacheadas) a partir de public/exercise-images. */
export function seedImageUrl(dbId: string, frame: 0 | 1): string {
  return `${import.meta.env.BASE_URL}exercise-images/${dbId}/${frame}.jpg`;
}

/** URL raw no GitHub de uma imagem do índice (`<id>/0.jpg`). Exige conexão. */
export function exerciseDbRawUrl(path: string): string {
  return `${EXERCISE_DB_RAW}/${path}`;
}

export const MAX_IMAGE_SIDE = 800;
export const JPEG_QUALITY = 0.8;

/** Dimensões que cabem em `max` no lado maior, mantendo a proporção (nunca amplia). */
export function fitWithin(
  width: number,
  height: number,
  max = MAX_IMAGE_SIDE,
): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/** Redimensiona para no máximo 800px no lado maior e recodifica em JPEG 0.8 (SPEC §4.1). */
export async function resizeImage(blob: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(blob);
  const { width, height } = fitWithin(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponível');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (out) => {
        if (out) resolve(out);
        else reject(new Error('Não foi possível converter a imagem'));
      },
      'image/jpeg',
      JPEG_QUALITY,
    );
  });
}
