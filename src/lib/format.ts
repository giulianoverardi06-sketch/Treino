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

const weekdayDate = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});
const longDate = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const monthYear = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });
const time = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });

/** "qui., 5 de mar." */
export function formatWeekdayDate(iso: string): string {
  return weekdayDate.format(new Date(iso));
}

/** "quinta-feira, 5 de março de 2026" */
export function formatLongDate(iso: string): string {
  return longDate.format(new Date(iso));
}

/** "18:40" */
export function formatTime(iso: string): string {
  return time.format(new Date(iso));
}

/** "2026-03" → "março de 2026" */
export function formatMonthKey(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return monthYear.format(new Date(y ?? 2000, (m ?? 1) - 1, 1));
}

/** 52 → "52 min"; 95 → "1h35" */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}
