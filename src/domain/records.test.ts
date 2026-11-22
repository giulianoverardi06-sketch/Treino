import { describe, expect, it } from 'vitest';
import { at, makeSession, makeSets } from '@/test/factories';
import { exerciseRecords, exerciseSessionStats } from './records';
import { maxWeight, sessionVolume, setVolume } from './volume';

describe('volume', () => {
  it('setVolume = carga × reps, indefinido sem reps', () => {
    expect(setVolume({ weightKg: 40, reps: 10 })).toBe(400);
    expect(setVolume({ weightKg: 40 })).toBeUndefined();
  });

  it('sessionVolume ignora séries sem repetições', () => {
    expect(
      sessionVolume([{ weightKg: 40, reps: 10 }, { weightKg: 40 }, { weightKg: 35, reps: 8 }]),
    ).toEqual({ volume: 680, setsWithReps: 2, totalSets: 3, complete: false });
  });

  it('sessionVolume é null quando nenhuma série tem repetições', () => {
    expect(sessionVolume([{ weightKg: 40 }, { weightKg: 40 }])).toBeNull();
    expect(sessionVolume([])).toBeNull();
  });

  it('maxWeight considera todas as séries, com ou sem reps', () => {
    expect(maxWeight([{ weightKg: 40, reps: 10 }, { weightKg: 45 }])).toBe(45);
    expect(maxWeight([])).toBeUndefined();
  });
});

describe('records', () => {
  const s1 = makeSession('A', at('2026-03-01'));
  const s2 = makeSession('A', at('2026-03-04'));
  const s3 = makeSession('A', at('2026-03-07'));
  const discarded = makeSession('A', at('2026-03-08'), { status: 'descartada' });
  const sessions = [s3, s1, discarded, s2];
  const setLogs = [
    ...makeSets(s1, 'peck-deck', [
      [40, 10],
      [40, 10],
      [40, 9],
    ]), // volume 1160
    ...makeSets(s2, 'peck-deck', [[50], [50], [45]]), // maior carga, sem reps
    ...makeSets(s3, 'peck-deck', [[45, 12], [45, 8], [40]]), // melhor série 540; volume 900
    ...makeSets(discarded, 'peck-deck', [[100, 20]]),
    ...makeSets(s2, 'outro', [[200, 20]]),
  ];
  const stats = exerciseSessionStats('peck-deck', sessions, setLogs);

  it('stats por sessão em ordem cronológica, sem descartadas nem outros exercícios', () => {
    expect(stats.map((s) => s.sessionId)).toEqual([s1.id, s2.id, s3.id]);
    expect(stats.map((s) => s.maxWeightKg)).toEqual([40, 50, 45]);
    expect(stats.map((s) => s.volume?.volume ?? null)).toEqual([1160, null, 900]);
    expect(stats.map((s) => s.setCount)).toEqual([3, 3, 3]);
  });

  it('maior carga considera todas as séries (inclusive sem reps)', () => {
    expect(exerciseRecords(stats).maxWeight).toEqual({
      sessionId: s2.id,
      date: s2.startedAt,
      weightKg: 50,
    });
  });

  it('melhor série (carga × reps) e maior volume ignoram séries sem reps', () => {
    const r = exerciseRecords(stats);
    expect(r.bestSet).toEqual({
      sessionId: s3.id,
      date: s3.startedAt,
      weightKg: 45,
      reps: 12,
      product: 540,
    });
    expect(r.maxSessionVolume).toEqual({ sessionId: s1.id, date: s1.startedAt, volume: 1160 });
  });

  it('em empate vale a primeira vez', () => {
    const a = makeSession('A', at('2026-04-01'));
    const b = makeSession('A', at('2026-04-03'));
    const tie = exerciseSessionStats(
      'x',
      [a, b],
      [...makeSets(a, 'x', [[30, 10]]), ...makeSets(b, 'x', [[30, 10]])],
    );
    const r = exerciseRecords(tie);
    expect(r.maxWeight?.sessionId).toBe(a.id);
    expect(r.bestSet?.sessionId).toBe(a.id);
    expect(r.maxSessionVolume?.sessionId).toBe(a.id);
  });

  it('sem histórico, sem recordes; sem reps, só maior carga', () => {
    expect(exerciseRecords([])).toEqual({ maxWeight: null, bestSet: null, maxSessionVolume: null });
    const s = makeSession('A', at('2026-04-01'));
    const r = exerciseRecords(exerciseSessionStats('x', [s], makeSets(s, 'x', [[30], [32.5]])));
    expect(r.maxWeight?.weightKg).toBe(32.5);
    expect(r.bestSet).toBeNull();
    expect(r.maxSessionVolume).toBeNull();
  });
});
