import { describe, expect, it } from 'vitest';
import {
  applyCardioDraft,
  averageSpeedKmh,
  cardioLabel,
  cardioToDraft,
  cardioTotals,
  parseDecimal,
  validateCardio,
  type CardioDraft,
} from './cardio';
import type { CardioSession } from './types';

const now = new Date(2026, 2, 10, 20, 0);

function draft(patch: Partial<CardioDraft> = {}): CardioDraft {
  return {
    activity: 'esteira',
    activityName: '',
    date: '2026-03-10',
    time: '19:00',
    durationMin: '30',
    distanceKm: '',
    intensity: '',
    notes: '',
    ...patch,
  };
}

const c = (day: number, durationMin: number, distanceKm?: number): CardioSession => ({
  id: `c${day}`,
  activity: 'bicicleta',
  startedAt: new Date(2026, 2, day, 7, 0).toISOString(),
  durationMin,
  ...(distanceKm === undefined ? {} : { distanceKm }),
});

describe('cardio', () => {
  it('rótulo: nome livre só para "outro"', () => {
    expect(cardioLabel({ activity: 'eliptico' })).toBe('Elíptico');
    expect(cardioLabel({ activity: 'outro', activityName: ' Remo ' })).toBe('Remo');
    expect(cardioLabel({ activity: 'outro' })).toBe('Outro');
  });

  it('velocidade média só com distância', () => {
    expect(averageSpeedKmh({ durationMin: 30, distanceKm: 5 })).toBe(10);
    expect(averageSpeedKmh({ durationMin: 45, distanceKm: 4 })).toBe(5.3);
    expect(averageSpeedKmh({ durationMin: 30 })).toBeUndefined();
  });

  it('totais de 7 dias contam dias de calendário com hoje incluído', () => {
    const list = [c(10, 30, 5), c(4, 20, 2.5), c(3, 40), c(11, 10)];
    expect(cardioTotals(list, now, 7)).toEqual({ count: 2, minutes: 50, km: 7.5 });
    expect(cardioTotals(list, now, 30)).toEqual({ count: 3, minutes: 90, km: 7.5 });
  });

  it('números aceitam vírgula; texto inválido vira NaN', () => {
    expect(parseDecimal('4,25')).toBe(4.25);
    expect(parseDecimal('  ')).toBeUndefined();
    expect(parseDecimal('4km')).toBeNaN();
  });

  it('validação: duração obrigatória, distância opcional, nome para "outro", sem futuro', () => {
    expect(validateCardio(draft(), now)).toEqual({});
    expect(validateCardio(draft({ durationMin: '' }), now).durationMin).toBe('Informe a duração.');
    expect(validateCardio(draft({ durationMin: '0' }), now).durationMin).toMatch(/entre 1/);
    expect(validateCardio(draft({ distanceKm: 'x' }), now).distanceKm).toMatch(/km/);
    expect(validateCardio(draft({ activity: 'outro' }), now).activityName).toBeDefined();
    expect(validateCardio(draft({ date: '2026-03-11' }), now).date).toMatch(/futuro/);
    expect(validateCardio(draft({ date: '' }), now).date).toBe('Informe a data.');
  });

  it('rascunho ↔ sessão preserva os valores e omite opcionais vazios', () => {
    const made = applyCardioDraft(
      'x',
      draft({ distanceKm: '4,5', intensity: 'forte', notes: ' leve subida ' }),
    );
    expect(made).toEqual({
      id: 'x',
      activity: 'esteira',
      startedAt: new Date(2026, 2, 10, 19, 0).toISOString(),
      durationMin: 30,
      distanceKm: 4.5,
      intensity: 'forte',
      notes: 'leve subida',
    });
    expect(cardioToDraft(made, now)).toEqual(
      draft({ distanceKm: '4,5', intensity: 'forte', notes: 'leve subida' }),
    );
    expect(Object.keys(applyCardioDraft('y', draft()))).toEqual([
      'id',
      'activity',
      'startedAt',
      'durationMin',
    ]);
  });
});
