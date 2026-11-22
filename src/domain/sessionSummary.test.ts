import { describe, expect, it } from 'vitest';
import { at, makeSession, makeSets, seed } from '@/test/factories';
import { createAdHocEntry, createSessionFromTemplate, moveEntry } from './sessionFactory';
import { recordsBrokenInSession, summarizeSession } from './sessionSummary';
import type { WorkoutTemplate } from './types';

describe('recordsBrokenInSession', () => {
  it('detecta maior carga, melhor série e maior volume em relação ao histórico', () => {
    const before = makeSession('A', at('2026-03-01'));
    const today = makeSession('A', at('2026-03-04'), { status: 'em_andamento' });
    const logs = [
      ...makeSets(before, 'peck-deck', [
        [40, 10],
        [40, 10],
      ]),
      ...makeSets(today, 'peck-deck', [
        [42.5, 10],
        [42.5, 9], // volume 807,5 > 800
      ]),
      ...makeSets(today, 'crossover-medio', [[15, 12]]), // primeira vez: não é recorde
    ];
    expect(recordsBrokenInSession(today.id, [before, today], logs)).toEqual([
      { exerciseId: 'peck-deck', kinds: ['maxWeight', 'bestSet', 'maxSessionVolume'] },
    ]);
  });

  it('igualar não é recorde; sessões posteriores não contam como histórico', () => {
    const s1 = makeSession('A', at('2026-03-01'));
    const s2 = makeSession('A', at('2026-03-04'));
    const s3 = makeSession('A', at('2026-03-07'));
    const logs = [
      ...makeSets(s1, 'peck-deck', [[40]]),
      ...makeSets(s2, 'peck-deck', [[40]]),
      ...makeSets(s3, 'peck-deck', [[50]]),
    ];
    expect(recordsBrokenInSession(s2.id, [s1, s2, s3], logs)).toEqual([]);
  });

  it('summarizeSession conta exercícios e séries', () => {
    const s = makeSession('A', at('2026-03-01'));
    const logs = [
      ...makeSets(s, 'peck-deck', [[40], [40]]),
      ...makeSets(s, 'crossover-medio', [[15]]),
    ];
    expect(summarizeSession(s, [s], logs)).toEqual({ exercisesDone: 2, totalSets: 3, records: [] });
  });
});

describe('sessionFactory', () => {
  const tplA = seed.templates[0] as WorkoutTemplate;
  let n = 0;
  const id = () => `id-${++n}`;

  it('cria a sessão com snapshot dos slots sem alterar o template', () => {
    const before = structuredClone(tplA);
    const s = createSessionFromTemplate(tplA, '2026-03-01T10:00:00.000Z', id);
    expect(s).toMatchObject({ letter: 'A', templateId: 'tpl-A', status: 'em_andamento' });
    expect(s.entries.map((e) => e.exerciseId)).toEqual(tplA.slots.map((x) => x.primaryExerciseId));
    expect(s.entries[1]).toMatchObject({
      slotId: 'A-2',
      label: 'Deltoide lateral',
      plannedSets: 8,
      protocol: 'drop_lateral',
      order: 1,
      skipped: false,
    });
    expect(tplA).toEqual(before);
  });

  it('entrada avulsa vai para o fim', () => {
    const s = createSessionFromTemplate(tplA, '2026-03-01T10:00:00.000Z', id);
    const ex = seed.exercises.find((e) => e.id === 'face-pull');
    if (!ex) throw new Error('seed');
    const entry = createAdHocEntry(s, ex, id);
    expect(entry).toMatchObject({ exerciseId: 'face-pull', order: 6, label: 'Face pull' });
    expect(entry.slotId).toBeUndefined();
  });

  it('moveEntry troca vizinhos e renumera; sem efeito nas bordas', () => {
    const s = createSessionFromTemplate(tplA, '2026-03-01T10:00:00.000Z', id);
    const [first, second] = s.entries;
    if (!first || !second) throw new Error('seed');
    const moved = moveEntry(s.entries, second.id, -1);
    expect(moved.slice(0, 2).map((e) => e.id)).toEqual([second.id, first.id]);
    expect(moved.map((e) => e.order)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(moveEntry(s.entries, first.id, -1).map((e) => e.id)).toEqual(s.entries.map((e) => e.id));
  });
});
