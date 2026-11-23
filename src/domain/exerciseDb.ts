import { normalizeName } from './program';

/** Entrada de `src/data/exerciseDbIndex.json` (free-exercise-db). */
export interface ExerciseDbEntry {
  id: string;
  name: string;
  primaryMuscles: string[];
  equipment: string | null;
  images: string[];
}

/**
 * Busca no índice do banco aberto: todas as palavras precisam aparecer no nome (sem acento/caixa).
 * Só entradas com ao menos uma imagem. Resultado em ordem alfabética, limitado.
 */
export function searchExerciseDb(
  index: readonly ExerciseDbEntry[],
  query: string,
  limit = 40,
): ExerciseDbEntry[] {
  const words = normalizeName(query).split(' ').filter(Boolean);
  if (words.length === 0) return [];
  return index
    .filter((e) => e.images.length > 0)
    .filter((e) => {
      const name = normalizeName(e.name.replace(/[-_/]/g, ' '));
      return words.every((w) => name.includes(w));
    })
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, limit);
}
