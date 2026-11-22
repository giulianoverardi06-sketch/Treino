import { describe, expect, it } from 'vitest';
import {
  applyDrop,
  buildRows,
  parseReps,
  parseWeight,
  propagateWeight,
  stepWeight,
  type RowState,
} from './sessionRows';

const rows = (weights: number[], confirmedUpTo = 0, prefill = weights): RowState[] =>
  weights.map((w, i) => ({
    setIndex: i + 1,
    weightKg: w,
    confirmed: i + 1 <= confirmedUpTo,
    touched: false,
    prefillKg: prefill[i] ?? w,
  }));

describe('applyDrop (↓ reduzir)', () => {
  it('reduz esta série e leva as seguintes ao novo teto', () => {
    const changes = applyDrop(rows([8, 8, 8, 8, 8, 8, 8, 8], 3), 4, 2);
    expect([...changes]).toEqual([
      [4, 6],
      [5, 6],
      [6, 6],
      [7, 6],
      [8, 6],
    ]);
  });

  it('não aumenta séries seguintes que já estavam abaixo', () => {
    const changes = applyDrop(rows([8, 8, 8, 8, 6, 6, 4, 4], 3), 4, 2);
    expect(Object.fromEntries(changes)).toEqual({ 4: 6 });
  });

  it('não mexe em séries confirmadas nem anteriores', () => {
    expect(applyDrop(rows([8, 8, 8], 2), 2, 2).size).toBe(0);
    const r = rows([8, 8, 8], 0);
    expect(applyDrop(r, 2, 2).has(1)).toBe(false);
  });

  it('não fica negativo', () => {
    expect(Object.fromEntries(applyDrop(rows([1, 1]), 1, 2))).toEqual({ 1: 0, 2: 0 });
  });
});

describe('propagateWeight', () => {
  it('leva a nova carga às seguintes com a mesma carga pré-preenchida', () => {
    const r = rows([42.5, 40, 37.5], 1, [40, 40, 37.5]);
    expect(Object.fromEntries(propagateWeight(r, 1, 42.5))).toEqual({ 2: 42.5 });
  });

  it('não propaga se a carga confirmada é a pré-preenchida', () => {
    expect(propagateWeight(rows([40, 40, 40], 1), 1, 40).size).toBe(0);
  });

  it('respeita séries editadas à mão e confirmadas', () => {
    const r = rows([42.5, 40, 40, 40], 1, [40, 40, 40, 40]);
    r[1] = { ...r[1]!, touched: true }; // eslint-disable-line @typescript-eslint/no-non-null-assertion
    r[2] = { ...r[2]!, confirmed: true }; // eslint-disable-line @typescript-eslint/no-non-null-assertion
    expect(Object.fromEntries(propagateWeight(r, 1, 42.5))).toEqual({ 4: 42.5 });
  });
});

describe('entrada de números', () => {
  it('stepWeight soma/subtrai sem ruído e sem negativo', () => {
    expect(stepWeight(42.5, 2.5, 1)).toBe(45);
    expect(stepWeight(0.1, 0.2, 1)).toBe(0.3);
    expect(stepWeight(1, 2.5, -1)).toBe(0);
  });

  it('parseWeight aceita vírgula e rejeita lixo', () => {
    expect(parseWeight('42,5')).toBe(42.5);
    expect(parseWeight(' 40 ')).toBe(40);
    expect(parseWeight('')).toBeUndefined();
    expect(parseWeight('abc')).toBeUndefined();
    expect(parseWeight('-5')).toBeUndefined();
  });

  it('parseReps aceita só inteiros', () => {
    expect(parseReps('12')).toBe(12);
    expect(parseReps('')).toBeUndefined();
    expect(parseReps('8.5')).toBeUndefined();
  });
});

describe('buildRows', () => {
  const prefill = [
    { setIndex: 1, weightKg: 40, toFailure: true, lastReps: 10 },
    { setIndex: 2, weightKg: 40, toFailure: true },
  ];
  const log = {
    id: 'l1',
    sessionId: 's',
    entryId: 'e',
    exerciseId: 'x',
    setIndex: 1,
    weightKg: 42.5,
    reps: 9,
    toFailure: false,
    completedAt: '2026-03-01T10:00:00Z',
  };

  it('registro > rascunho > pré-preenchimento', () => {
    const rows = buildRows(prefill, [log], {
      1: { weightKg: 50 },
      2: { weightKg: 45, touched: true },
    });
    expect(rows[0]).toMatchObject({
      confirmed: true,
      weightKg: 42.5,
      reps: 9,
      toFailure: false,
      logId: 'l1',
      lastReps: 10,
    });
    expect(rows[1]).toMatchObject({ confirmed: false, weightKg: 45, touched: true, prefillKg: 40 });
  });

  it('cria linhas para registros além das planejadas', () => {
    const rows = buildRows(prefill, [{ ...log, id: 'l3', setIndex: 3 }], {});
    expect(rows).toHaveLength(3);
    expect(rows[2]).toMatchObject({ confirmed: true, prefillKg: 40 });
  });
});
