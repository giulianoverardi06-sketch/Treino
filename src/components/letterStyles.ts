import type { Letter } from '@/domain/types';

/** Classes de destaque por letra (cor consistente em cards, histórico e gráficos). */
export const LETTER_STYLES: Record<Letter, { text: string; bg: string; border: string }> = {
  A: { text: 'text-letter-a', bg: 'bg-letter-a', border: 'border-l-letter-a' },
  B: { text: 'text-letter-b', bg: 'bg-letter-b', border: 'border-l-letter-b' },
  C: { text: 'text-letter-c', bg: 'bg-letter-c', border: 'border-l-letter-c' },
};
