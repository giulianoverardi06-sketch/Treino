import { describe, expect, it } from 'vitest';
import { at, makeSession, makeSets, seedExercises } from '@/test/factories';
import {
  filterByPeriod,
  lateralSessionIds,
  loadTrend,
  pushPullBalance,
  setsByMuscle,
} from './progress';
import type { ExerciseSessionStat } from './records';

const now = new Date('2026-06-30T12:00:00Z');

const stat = (maxWeightKg: number, i = 0): ExerciseSessionStat => ({
  sessionId: `s${i}`,
  date: at(`2026-06-${String(i + 1).padStart(2, '0')}`),
  sets: [],
  maxWeightKg,
  volume: null,
  setCount: 3,
  failureSets: 3,
});
const series = (...w: number[]) => w.map((x, i) => stat(x, i));

describe('filterByPeriod', () => {
  const items = [
    { date: at('2026-06-30') },
    { date: at('2026-06-01') }, // 29 dias
    { date: at('2026-05-31') }, // 30 dias
    { date: at('2025-07-01') }, // 364 dias
    { date: at('2025-06-30') }, // 365 dias
  ];
  it('30d, 90d, 1 ano e tudo', () => {
    expect(filterByPeriod(items, '30d', now)).toHaveLength(2);
    expect(filterByPeriod(items, '90d', now)).toHaveLength(3);
    expect(filterByPeriod(items, '1y', now)).toHaveLength(4);
    expect(filterByPeriod(items, 'all', now)).toHaveLength(5);
  });
});

describe('loadTrend', () => {
  it('poucos dados', () => {
    expect(loadTrend(series(40))).toEqual({ kind: 'insufficient' });
  });

  it('subiu X kg nas últimas N sessões (janela de 5)', () => {
    expect(loadTrend(series(30, 35, 40, 40, 42.5, 45))).toEqual({
      kind: 'up',
      deltaKg: 10,
      sessions: 5,
    });
    expect(loadTrend(series(40, 42.5))).toEqual({ kind: 'up', deltaKg: 2.5, sessions: 2 });
  });

  it('caiu', () => {
    expect(loadTrend(series(50, 45))).toEqual({ kind: 'down', deltaKg: 5, sessions: 2 });
  });

  it('estável há N sessões', () => {
    expect(loadTrend(series(35, 40, 40, 40, 40))).toEqual({
      kind: 'stable',
      weightKg: 40,
      sessions: 4,
    });
  });

  it('mesma carga no início e no fim da janela conta como estável', () => {
    expect(loadTrend(series(40, 42.5, 40))).toMatchObject({ kind: 'stable', weightKg: 40 });
  });
});

describe('setsByMuscle e equilíbrio', () => {
  const recent = makeSession('A', at('2026-06-28'));
  const old = makeSession('B', at('2026-05-01'));
  const discarded = makeSession('B', at('2026-06-29'), { status: 'descartada' });
  const logs = [
    ...makeSets(recent, 'supino-inclinado-maquina', [[40], [40], [40]]), // peito_superior
    ...makeSets(recent, 'remada-baixa', [[50], [50]]), // costas_medias + dorsais
    ...makeSets(recent, 'pulley-frente', [[50]]), // dorsais (bíceps é secundário)
    ...makeSets(old, 'rosca-direta-polia', [[20], [20]]),
    ...makeSets(discarded, 'rosca-direta-polia', [[20]]),
  ];
  const sessions = [recent, old, discarded];

  it('conta só primários, só concluídas, na janela', () => {
    const c = setsByMuscle(sessions, logs, seedExercises, now, 7);
    expect(Object.fromEntries(c)).toEqual({ peito_superior: 3, costas_medias: 2, dorsais: 3 });
    expect(setsByMuscle(sessions, logs, seedExercises, now, 90).get('biceps')).toBe(2);
  });

  it('empurrar vs puxar', () => {
    const c = setsByMuscle(sessions, logs, seedExercises, now, 7);
    expect(pushPullBalance(c)).toEqual({ push: 3, pull: 5, ratio: 0.6 });
    expect(pushPullBalance(new Map())).toEqual({ push: 0, pull: 0, ratio: null });
  });
});

describe('lateralSessionIds', () => {
  it('só sessões em que o exercício seguiu o protocolo lateral', () => {
    const a = makeSession('A', at('2026-06-01'), {
      entries: [
        {
          id: 'e1',
          exerciseId: 'elevacao-lateral-halteres',
          order: 0,
          skipped: false,
          label: 'Deltoide lateral',
          plannedSets: 8,
          optional: false,
          protocol: 'drop_lateral',
        },
      ],
    });
    const c = makeSession('C', at('2026-06-02'), {
      entries: [
        {
          id: 'e2',
          exerciseId: 'elevacao-lateral-halteres',
          order: 0,
          skipped: false,
          label: 'Elevação lateral com halteres',
          plannedSets: 3,
          optional: false,
          protocol: 'padrao',
        },
      ],
    });
    expect([...lateralSessionIds([a, c], 'elevacao-lateral-halteres')]).toEqual([a.id]);
  });
});
