import { describe, expect, it } from 'vitest';
import { at, makeSession, makeSets, seedExercises } from '@/test/factories';
import { homeSummary, needsBackupReminder } from './homeSummary';
import { overlapDetails } from './overlap';

const now = new Date('2026-03-20T12:00:00Z');

describe('homeSummary', () => {
  const sessions = [
    makeSession('A', at('2026-03-20', 8)), // hoje
    makeSession('B', at('2026-03-14')), // 6 dias
    makeSession('C', at('2026-03-13')), // 7 dias → fora dos 7
    makeSession('A', at('2026-02-19')), // 29 dias
    makeSession('B', at('2026-02-18')), // 30 dias → fora dos 30
    makeSession('C', at('2026-03-19'), { status: 'descartada' }),
    makeSession('C', at('2026-03-20', 11), { status: 'em_andamento' }),
  ];

  it('conta sessões concluídas em 7 e 30 dias de calendário', () => {
    const s = homeSummary(sessions, now);
    expect(s.last7).toBe(2);
    expect(s.last30).toBe(4);
  });

  it('data da última sessão concluída de cada letra', () => {
    expect(homeSummary(sessions, now).lastByLetter).toEqual({
      A: at('2026-03-20', 8),
      B: at('2026-03-14'),
      C: at('2026-03-13'),
    });
    expect(homeSummary([], now).lastByLetter).toEqual({ A: undefined, B: undefined, C: undefined });
  });
});

describe('needsBackupReminder', () => {
  const done = [makeSession('A', at('2026-03-01'))];

  it('sem sessões concluídas, sem lembrete', () => {
    expect(needsBackupReminder({}, [], now)).toBe(false);
  });

  it('nunca feito → lembra', () => {
    expect(needsBackupReminder({}, done, now)).toBe(true);
  });

  it('mais de 14 dias → lembra; até 14 → não', () => {
    expect(needsBackupReminder({ lastBackupAt: at('2026-03-05') }, done, now)).toBe(true);
    expect(needsBackupReminder({ lastBackupAt: at('2026-03-06') }, done, now)).toBe(false);
  });
});

describe('overlapDetails', () => {
  it('informa o fim da sessão mais recente de cada grupo', () => {
    const a = makeSession('A', at('2026-03-19', 15));
    const b = makeSession('B', at('2026-03-20', 7));
    const logs = [
      ...makeSets(a, 'rosca-direta-polia', [[20]]),
      ...makeSets(b, 'rosca-martelo', [[14]]),
    ];
    expect(
      overlapDetails({
        muscles: ['dorsais', 'biceps'],
        sessions: [a, b],
        setLogs: logs,
        exercises: seedExercises,
        now,
      }),
    ).toEqual([{ muscle: 'biceps', finishedAt: b.finishedAt }]);
  });
});
