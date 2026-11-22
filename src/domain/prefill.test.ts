import { describe, expect, it } from 'vitest';
import { at, makeSession, makeSets } from '@/test/factories';
import { lastPerformance, prefillFromLastSession } from './prefill';

const base = { defaultToFailure: true, plannedSets: 3 } as const;

describe('prefillFromLastSession', () => {
  it('usa a carga da mesma série na última sessão do exercício', () => {
    const old = makeSession('A', at('2026-03-01'));
    const last = makeSession('A', at('2026-03-04'));
    const setLogs = [
      ...makeSets(old, 'peck-deck', [[30], [30], [30]]),
      ...makeSets(last, 'peck-deck', [
        [35, 12],
        [35, 10],
        [32.5, 9],
      ]),
    ];
    const rows = prefillFromLastSession({
      ...base,
      exerciseId: 'peck-deck',
      sessions: [old, last],
      setLogs,
    });
    expect(rows).toEqual([
      { setIndex: 1, weightKg: 35, toFailure: true, lastReps: 12 },
      { setIndex: 2, weightKg: 35, toFailure: true, lastReps: 10 },
      { setIndex: 3, weightKg: 32.5, toFailure: true, lastReps: 9 },
    ]);
  });

  it('usa a última sessão do EXERCÍCIO, mesmo feito como alternativa em outro slot/template', () => {
    // Crossover médio: alternativa do slot "Crucifixo médio" do A. Feito por último num treino C
    // (adicionado na hora). A sessão A mais recente não teve crossover.
    const a1 = makeSession('A', at('2026-03-01'));
    const c = makeSession('C', at('2026-03-03'));
    const a2 = makeSession('A', at('2026-03-05'));
    const setLogs = [
      ...makeSets(a1, 'crossover-medio', [[15], [15], [15]]),
      ...makeSets(c, 'crossover-medio', [[20], [20], [17.5]]),
      ...makeSets(a2, 'peck-deck', [[40], [40], [40]]),
    ];
    const rows = prefillFromLastSession({
      ...base,
      exerciseId: 'crossover-medio',
      sessions: [a1, c, a2],
      setLogs,
    });
    expect(rows.map((r) => r.weightKg)).toEqual([20, 20, 17.5]);
  });

  it('repete a última carga quando o planejado tem mais séries que a última sessão', () => {
    const s = makeSession('A', at('2026-03-01'));
    const rows = prefillFromLastSession({
      ...base,
      plannedSets: 4,
      exerciseId: 'peck-deck',
      sessions: [s],
      setLogs: makeSets(s, 'peck-deck', [[30], [27.5]]),
    });
    expect(rows.map((r) => r.weightKg)).toEqual([30, 27.5, 27.5, 27.5]);
    expect(rows.map((r) => r.lastReps)).toEqual([undefined, undefined, undefined, undefined]);
  });

  it('sem histórico usa a carga de fallback (ou 0) e a falha padrão', () => {
    const rows = prefillFromLastSession({
      exerciseId: 'elevacao-lateral-halteres',
      plannedSets: 8,
      sessions: [],
      setLogs: [],
      defaultToFailure: false,
      fallbackWeightKg: 8,
    });
    expect(rows).toHaveLength(8);
    expect(rows.every((r) => r.weightKg === 8 && !r.toFailure)).toBe(true);
    expect(
      prefillFromLastSession({ ...base, exerciseId: 'x', sessions: [], setLogs: [] })[0]?.weightKg,
    ).toBe(0);
  });

  it('não usa a sessão atual nem sessões descartadas como referência', () => {
    const done = makeSession('A', at('2026-03-01'));
    const discarded = makeSession('A', at('2026-03-03'), { status: 'descartada' });
    const current = makeSession('A', at('2026-03-05'), { status: 'em_andamento' });
    const setLogs = [
      ...makeSets(done, 'peck-deck', [[30]]),
      ...makeSets(discarded, 'peck-deck', [[50]]),
      ...makeSets(current, 'peck-deck', [[60]]),
    ];
    const rows = prefillFromLastSession({
      ...base,
      plannedSets: 1,
      exerciseId: 'peck-deck',
      sessions: [done, discarded, current],
      setLogs,
      excludeSessionId: current.id,
    });
    expect(rows[0]?.weightKg).toBe(30);
  });

  it('a falha padrão vem do parâmetro, não da última sessão', () => {
    const s = makeSession('A', at('2026-03-01'));
    const rows = prefillFromLastSession({
      ...base,
      plannedSets: 1,
      exerciseId: 'peck-deck',
      sessions: [s],
      setLogs: makeSets(s, 'peck-deck', [[30]]).map((l) => ({ ...l, toFailure: false })),
    });
    expect(rows[0]?.toFailure).toBe(true);
  });
});

describe('lastPerformance', () => {
  it('ordena as séries por índice mesmo fora de ordem no banco', () => {
    const s = makeSession('A', at('2026-03-01'));
    const stored = makeSets(s, 'peck-deck', [[30], [32.5], [35]]).reverse();
    const result = lastPerformance('peck-deck', [s], stored);
    expect(result?.sets.map((x) => x.weightKg)).toEqual([30, 32.5, 35]);
  });
});
