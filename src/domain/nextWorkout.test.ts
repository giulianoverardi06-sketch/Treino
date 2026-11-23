import { describe, expect, it } from 'vitest';
import { at, makeSession } from '@/test/factories';
import { daysSinceLetter, lastSessionOfLetter, nextLetter, nextWorkout } from './nextWorkout';

describe('nextWorkout', () => {
  it('sem sessões → A', () => {
    expect(nextWorkout([])).toEqual({ kind: 'suggest', letter: 'A' });
  });

  it('última concluída A → B', () => {
    const a = makeSession('A', at('2026-03-01'));
    expect(nextWorkout([a])).toEqual({ kind: 'suggest', letter: 'B', basedOn: a });
  });

  it('última concluída C → A', () => {
    const sessions = [
      makeSession('A', at('2026-03-01')),
      makeSession('B', at('2026-03-02')),
      makeSession('C', at('2026-03-04')),
    ];
    expect(nextWorkout(sessions)).toMatchObject({ kind: 'suggest', letter: 'A' });
  });

  it('usa a ordem real (data), não a ordem do array', () => {
    const sessions = [makeSession('B', at('2026-03-05')), makeSession('A', at('2026-03-01'))];
    expect(nextWorkout(sessions)).toMatchObject({ letter: 'C' });
  });

  it('segue a sequência mesmo após dias de descanso e escolhas manuais', () => {
    const sessions = [
      makeSession('A', at('2026-03-01')),
      makeSession('C', at('2026-03-02')), // escolha manual fora de ordem
      makeSession('B', at('2026-03-12')), // 10 dias depois
    ];
    expect(nextWorkout(sessions)).toMatchObject({ letter: 'C' });
  });

  it('sessão em andamento tem prioridade', () => {
    const current = makeSession('C', at('2026-03-03'), { status: 'em_andamento' });
    const sessions = [
      makeSession('A', at('2026-03-01')),
      current,
      makeSession('B', at('2026-03-02')),
    ];
    expect(nextWorkout(sessions)).toEqual({ kind: 'continue', session: current });
  });

  it('sessões descartadas são ignoradas', () => {
    const sessions = [
      makeSession('A', at('2026-03-01')),
      makeSession('B', at('2026-03-02'), { status: 'descartada' }),
    ];
    expect(nextWorkout(sessions)).toMatchObject({ kind: 'suggest', letter: 'B' });
    expect(nextWorkout([makeSession('B', at('2026-03-02'), { status: 'descartada' })])).toEqual({
      kind: 'suggest',
      letter: 'A',
    });
  });

  it('nextLetter fecha o ciclo', () => {
    expect([nextLetter('A'), nextLetter('B'), nextLetter('C')]).toEqual(['B', 'C', 'A']);
  });
});

describe('última sessão por letra', () => {
  const sessions = [
    makeSession('A', at('2026-03-01')),
    makeSession('A', at('2026-03-04')),
    makeSession('A', at('2026-03-06'), { status: 'descartada' }),
    makeSession('B', at('2026-03-05')),
  ];

  it('pega a concluída mais recente da letra', () => {
    expect(lastSessionOfLetter(sessions, 'A')?.startedAt).toBe(at('2026-03-04'));
    expect(lastSessionOfLetter(sessions, 'C')).toBeUndefined();
  });

  it('conta dias de calendário desde a última sessão da letra', () => {
    const now = new Date('2026-03-07T12:00:00Z');
    expect(daysSinceLetter(sessions, 'A', now)).toBe(3);
    expect(daysSinceLetter(sessions, 'B', now)).toBe(2);
    expect(daysSinceLetter(sessions, 'C', now)).toBeUndefined();
  });
});

describe('rotação de 2 a 5 treinos (SPEC §12.1)', () => {
  const ABCDE = ['A', 'B', 'C', 'D', 'E'] as const;

  it('com cinco treinos, C → D e E → A', () => {
    expect(nextWorkout([makeSession('C', at('2026-03-01'))], ABCDE)).toMatchObject({
      letter: 'D',
    });
    expect(nextWorkout([makeSession('E', at('2026-03-01'))], ABCDE)).toMatchObject({
      letter: 'A',
    });
  });

  it('com dois treinos, A ↔ B', () => {
    expect(nextLetter('A', ['A', 'B'])).toBe('B');
    expect(nextLetter('B', ['A', 'B'])).toBe('A');
  });

  it('letra removida: segue para a próxima que existe depois dela, ou volta ao A', () => {
    expect(nextLetter('D', ['A', 'B', 'C'])).toBe('A');
    expect(nextLetter('C', ['A', 'B'])).toBe('A');
  });

  it('sem histórico sugere a primeira letra da rotação', () => {
    expect(nextWorkout([], ['A', 'B'])).toEqual({ kind: 'suggest', letter: 'A' });
  });
});
