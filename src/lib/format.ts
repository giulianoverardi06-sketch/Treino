import type { SetLog } from '@/domain/types';

const kgFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });

/** 42.5 → "42,5" */
export function formatNumber(value: number): string {
  return kgFormatter.format(value);
}

/** 42.5 → "42,5 kg" */
export function formatKg(value: number): string {
  return `${formatNumber(value)} kg`;
}

/**
 * Resumo curto de um conjunto de séries, para a referência "Última: …".
 *   3×42,5 kg, falha          (mesma carga, todas até a falha)
 *   40 / 40 / 37,5 kg         (cargas diferentes)
 *   3×40 kg (10, 9, 8)        (com repetições)
 */
export function describeSets(
  sets: readonly Pick<SetLog, 'weightKg' | 'reps' | 'toFailure'>[],
): string {
  if (sets.length === 0) return '';
  const weights = sets.map((s) => s.weightKg);
  const first = weights[0] ?? 0;
  const load = weights.every((w) => w === first)
    ? `${sets.length}×${formatKg(first)}`
    : `${weights.map(formatNumber).join(' / ')} kg`;

  const reps = sets.map((s) => s.reps);
  const repsText = reps.some((r) => r !== undefined)
    ? ` (${reps.map((r) => (r === undefined ? '–' : String(r))).join(', ')})`
    : '';

  const failure = sets.every((s) => s.toFailure) ? ', falha' : '';
  return `${load}${repsText}${failure}`;
}

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' });

/** "04 de mar." */
export function formatShortDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

/** 0 → "hoje", 1 → "ontem", n → "há n dias". */
export function formatDaysAgo(days: number): string {
  if (days <= 0) return 'hoje';
  if (days === 1) return 'ontem';
  return `há ${days} dias`;
}

/** plural(1, 'sessão', 'sessões') → "sessão" */
export function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}
