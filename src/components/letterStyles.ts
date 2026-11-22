import type { Letter } from '@/domain/types';

/** Cor de cada treino (quadrado de saguão, gráficos, histórico). */
export const LETTER_STYLES: Record<Letter, { text: string; bg: string; fill: string }> = {
  A: { text: 'text-letter-a', bg: 'bg-letter-a', fill: 'fill-letter-a' },
  B: { text: 'text-letter-b', bg: 'bg-letter-b', fill: 'fill-letter-b' },
  C: { text: 'text-letter-c', bg: 'bg-letter-c', fill: 'fill-letter-c' },
};
