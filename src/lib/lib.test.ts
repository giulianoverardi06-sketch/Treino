import { describe, expect, it } from 'vitest';
import { calendarDaysBetween } from './dates';
import { formatKg } from './format';

describe('formatKg', () => {
  it('usa vírgula decimal e omite zeros', () => {
    expect(formatKg(42.5)).toBe('42,5 kg');
    expect(formatKg(40)).toBe('40 kg');
    expect(formatKg(1.25)).toBe('1,25 kg');
  });
});

describe('calendarDaysBetween', () => {
  it('conta dias de calendário, não blocos de 24h', () => {
    const lateYesterday = new Date(2026, 2, 1, 23, 30).toISOString();
    expect(calendarDaysBetween(lateYesterday, new Date(2026, 2, 2, 7, 0))).toBe(1);
    expect(calendarDaysBetween(lateYesterday, new Date(2026, 2, 1, 23, 59))).toBe(0);
    expect(calendarDaysBetween(lateYesterday, new Date(2026, 2, 8, 12, 0))).toBe(7);
  });
});
