import { describe, expect, it } from 'vitest';
import { at, makeSession, makeSets } from '@/test/factories';
import { initialRepsSum, lateralInitialRepsMetric } from './lateralMetric';

const EX = 'elevacao-lateral-halteres';

/** Uma sessão de lateral por dia: `[[peso, reps?], ...]`. */
function history(...days: (readonly (readonly [number, number?])[])[]) {
  return days.map((sets, i) => {
    const session = makeSession('A', at(`2026-03-${String(i + 1).padStart(2, '0')}`));
    return { sessionId: session.id, date: session.startedAt, sets: makeSets(session, EX, sets) };
  });
}

/** Séries de uma única sessão. */
const setsOf = (sets: readonly (readonly [number, number?])[]) => history(sets)[0]?.sets ?? [];

const drop8 = (r1: number, r2: number, r3: number) =>
  [[8, r1], [8, r2], [8, r3], [6, 10], [6], [4], [4], [4]] as const;

describe('initialRepsSum', () => {
  it('soma as séries 1–3 na carga inicial com reps informadas', () => {
    const sets = setsOf(drop8(12, 10, 9));
    expect(initialRepsSum(sets)).toBe(31);
  });

  it('indefinido se faltam reps em alguma das 3 primeiras', () => {
    const sets = setsOf([[8, 12], [8], [8, 9], [6, 10]]);
    expect(initialRepsSum(sets)).toBeUndefined();
  });

  it('indefinido se a carga caiu antes da 3ª série', () => {
    const sets = setsOf([
      [8, 12],
      [8, 10],
      [6, 12],
    ]);
    expect(initialRepsSum(sets)).toBeUndefined();
  });

  it('indefinido com menos de 3 séries', () => {
    const sets = setsOf([
      [8, 12],
      [8, 10],
    ]);
    expect(initialRepsSum(sets)).toBeUndefined();
  });
});

describe('lateralInitialRepsMetric', () => {
  it('um ponto por sessão válida, ignorando sessões sem reps', () => {
    const m = lateralInitialRepsMetric(
      history(drop8(10, 9, 8), [[8], [8], [8], [6]], drop8(11, 10, 9)),
    );
    expect(m.points.map((p) => p.repsSum)).toEqual([27, 30]);
    expect(m.warn).toBe(false);
  });

  it('avisa após 4 sessões seguidas sem aumento (estável ou queda)', () => {
    const three = history(drop8(10, 10, 10), drop8(10, 10, 10), drop8(10, 9, 9), drop8(10, 10, 10));
    expect(lateralInitialRepsMetric(three)).toMatchObject({
      sessionsWithoutIncrease: 3,
      warn: false,
    });

    const four = history(
      drop8(10, 10, 10),
      drop8(10, 10, 10),
      drop8(10, 9, 9),
      drop8(10, 10, 10),
      drop8(9, 9, 9),
    );
    expect(lateralInitialRepsMetric(four)).toMatchObject({
      sessionsWithoutIncrease: 4,
      warn: true,
    });
  });

  it('oscilar sem superar a melhor marca conta como sem aumento', () => {
    const m = lateralInitialRepsMetric(
      history(
        drop8(10, 10, 10), // 30
        drop8(11, 11, 10), // 32 — melhor
        drop8(11, 10, 10), // 31
        drop8(11, 11, 10), // 32 (igual, não supera)
        drop8(11, 10, 10), // 31
        drop8(11, 11, 10), // 32
      ),
    );
    expect(m.sessionsWithoutIncrease).toBe(4);
    expect(m.warn).toBe(true);
  });

  it('um aumento zera a contagem', () => {
    const m = lateralInitialRepsMetric(
      history(
        drop8(10, 10, 10),
        drop8(10, 10, 10),
        drop8(10, 10, 10),
        drop8(10, 10, 10),
        drop8(10, 10, 10),
        drop8(11, 10, 10),
      ),
    );
    expect(m).toMatchObject({ sessionsWithoutIncrease: 0, warn: false });
  });

  it('subir a carga inicial reinicia a contagem', () => {
    const heavier = [[9, 8], [9, 8], [9, 7], [7], [7], [5], [5], [5]] as const;
    const m = lateralInitialRepsMetric(
      history(
        drop8(10, 10, 10),
        drop8(10, 10, 10),
        drop8(10, 10, 10),
        drop8(10, 10, 10),
        heavier, // soma menor, mas carga maior
        heavier,
      ),
    );
    expect(m.points.at(-1)).toMatchObject({ initialWeightKg: 9, repsSum: 23 });
    expect(m).toMatchObject({ sessionsWithoutIncrease: 1, warn: false });
  });

  it('sem histórico: sem pontos e sem aviso', () => {
    expect(lateralInitialRepsMetric([])).toEqual({
      points: [],
      sessionsWithoutIncrease: 0,
      warn: false,
    });
  });
});
