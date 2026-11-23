import type { Letter } from '@/domain/types';

/**
 * Cor de cada treino (quadrado de saguão, gráficos, histórico). `onBg` é a cor da letra dentro do
 * quadrado: D (âmbar) usa preto para manter o contraste.
 */
export const LETTER_STYLES: Record<
  Letter,
  { text: string; bg: string; fill: string; onBg: string }
> = {
  A: { text: 'text-letter-a', bg: 'bg-letter-a', fill: 'fill-letter-a', onBg: 'text-white' },
  B: { text: 'text-letter-b', bg: 'bg-letter-b', fill: 'fill-letter-b', onBg: 'text-white' },
  C: { text: 'text-letter-c', bg: 'bg-letter-c', fill: 'fill-letter-c', onBg: 'text-white' },
  D: { text: 'text-letter-d', bg: 'bg-letter-d', fill: 'fill-letter-d', onBg: 'text-black' },
  E: { text: 'text-letter-e', bg: 'bg-letter-e', fill: 'fill-letter-e', onBg: 'text-white' },
};
