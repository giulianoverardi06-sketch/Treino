/** Dias de calendário (fuso local) entre a data ISO e `now`. Ontem à noite → 1. */
export function calendarDaysBetween(fromIso: string, now: Date): number {
  const from = new Date(fromIso);
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((b - a) / 86_400_000);
}

export const HOUR_MS = 3_600_000;
