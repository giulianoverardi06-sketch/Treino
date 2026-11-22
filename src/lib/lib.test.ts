import { describe, expect, it } from 'vitest';
import { calendarDaysBetween } from './dates';
import { describeSets, formatKg } from './format';

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

describe('describeSets', () => {
  const s = (weightKg: number, reps?: number, toFailure = true) =>
    reps === undefined ? { weightKg, toFailure } : { weightKg, reps, toFailure };

  it('mesma carga, todas até a falha', () => {
    expect(describeSets([s(42.5), s(42.5), s(42.5)])).toBe('3×42,5 kg, falha');
  });

  it('cargas diferentes, sem falha em todas', () => {
    expect(describeSets([s(40), s(40), s(37.5, undefined, false)])).toBe('40 / 40 / 37,5 kg');
  });

  it('com repetições (parciais)', () => {
    expect(describeSets([s(40, 10), s(40), s(40, 8)])).toBe('3×40 kg (10, –, 8), falha');
  });

  it('vazio', () => {
    expect(describeSets([])).toBe('');
  });
});
