import { MUSCLE_LABELS } from '@/domain/labels';
import type { OverlapDetail } from '@/domain/overlap';
import { calendarDaysBetween } from '@/lib/dates';
import { formatDaysAgo } from '@/lib/format';

function joinPt(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} e ${items.at(-1) ?? ''}`;
}

/**
 * Texto do aviso de sobreposição: "Bíceps trabalhado ontem",
 * "Bíceps e dorsais trabalhados hoje", "Bíceps trabalhado hoje · Dorsais trabalhado ontem".
 */
export function overlapText(details: readonly OverlapDetail[], now: Date): string {
  const byDay = new Map<number, string[]>();
  for (const d of details) {
    const days = calendarDaysBetween(d.finishedAt, now);
    byDay.set(days, [...(byDay.get(days) ?? []), MUSCLE_LABELS[d.muscle]]);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a - b)
    .map(([days, labels]) => {
      const names = labels.map((l, i) => (i === 0 ? l : l.toLowerCase()));
      const verb = labels.length > 1 ? 'trabalhados' : 'trabalhado';
      return `${joinPt(names)} ${verb} ${formatDaysAgo(days)}`;
    })
    .join(' · ');
}
