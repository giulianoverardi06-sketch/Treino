import { describe, expect, it } from 'vitest';
import { at, makeSession, makeSets } from '@/test/factories';
import { groupByMonth, historyItems } from './history';

describe('historyItems', () => {
  const a1 = makeSession('A', at('2026-02-27'));
  const b1 = makeSession('B', at('2026-03-02'));
  const a2 = makeSession('A', at('2026-03-05'));
  const discarded = makeSession('C', at('2026-03-06'), { status: 'descartada' });
  const ongoing = makeSession('B', at('2026-03-07'), { status: 'em_andamento' });
  const sessions = [a1, discarded, a2, ongoing, b1];
  const logs = [
    ...makeSets(a2, 'peck-deck', [[40], [40], [40]]),
    ...makeSets(a2, 'crossover-medio', [[15]]),
    ...makeSets(b1, 'pulley-frente', [[50]]),
  ];

  it('só concluídas, da mais recente para a mais antiga', () => {
    expect(historyItems(sessions, logs).map((i) => i.session.id)).toEqual([a2.id, b1.id, a1.id]);
  });

  it('filtra por letra', () => {
    expect(historyItems(sessions, logs, { letter: 'A' }).map((i) => i.session.id)).toEqual([
      a2.id,
      a1.id,
    ]);
  });

  it('conta exercícios, séries e duração', () => {
    const [first] = historyItems(sessions, logs);
    expect(first).toMatchObject({ exercisesDone: 2, totalSets: 4, durationMin: 60 });
    expect(historyItems(sessions, logs).at(-1)).toMatchObject({ exercisesDone: 0, totalSets: 0 });
  });
});

describe('groupByMonth', () => {
  it('agrupa itens consecutivos do mesmo mês', () => {
    const dates = [
      new Date(2026, 2, 5).toISOString(),
      new Date(2026, 2, 1).toISOString(),
      new Date(2026, 1, 27).toISOString(),
    ];
    expect(groupByMonth(dates, (d) => d).map((g) => [g.key, g.items.length])).toEqual([
      ['2026-03', 2],
      ['2026-02', 1],
    ]);
  });
});
