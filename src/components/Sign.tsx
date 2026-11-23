import { ArrowRight, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Letter } from '@/domain/types';
import { LETTER_STYLES } from './letterStyles';

/*
 * Peças do sistema de sinalização. Amarelo (bg-sign) só para caminho / próxima ação.
 */

const TILE_SIZE = { sm: 'size-9 text-lg', md: 'size-11 text-xl', lg: 'size-14 text-2xl' } as const;

/** Quadrado preto com pictograma ou número em branco. */
export function Tile({
  icon: Icon,
  children,
  size = 'md',
  inverse = false,
  className = '',
}: {
  icon?: LucideIcon;
  children?: ReactNode;
  size?: keyof typeof TILE_SIZE;
  /** Tinta invertida do tema (estado "feito"). */
  inverse?: boolean;
  className?: string;
}) {
  const tone = inverse ? 'bg-text text-bg' : 'bg-tile text-on-tile';
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-[3px] font-bold num ${tone} ${TILE_SIZE[size]} ${className}`}
    >
      {Icon ? (
        <Icon size={size === 'lg' ? 30 : size === 'md' ? 24 : 20} strokeWidth={2.5} />
      ) : (
        children
      )}
    </span>
  );
}

/** Quadrado de saguão: a letra do treino sobre a cor do treino. */
export function LetterTile({
  letter,
  size = 'md',
  className = '',
}: {
  letter: Letter;
  size?: keyof typeof TILE_SIZE;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-[3px] font-bold ${LETTER_STYLES[letter].onBg} ${LETTER_STYLES[letter].bg} ${TILE_SIZE[size]} ${className}`}
    >
      {letter}
    </span>
  );
}

/**
 * Seta presa à borda de um botão de caminho (anatomia da placa: seta em quadrado + destino).
 * Herda a cor do botão.
 */
export function ArrowLead() {
  return (
    <span
      aria-hidden
      className="flex size-10 shrink-0 items-center justify-center rounded-[3px] border-2 border-current"
    >
      <ArrowRight size={24} strokeWidth={2.5} />
    </span>
  );
}
