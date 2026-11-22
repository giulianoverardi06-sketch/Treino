import { describe, expect, it } from 'vitest';
import { at, makeSession, makeSets, seed, seedExercises } from '@/test/factories';
import { overlapWarning, performedPrimaryMuscles, templatePrimaryMuscles } from './overlap';
import type { WorkoutTemplate } from './types';

const tpl = (letter: 'A' | 'B' | 'C') =>
  seed.templates.find((t) => t.letter === letter) as WorkoutTemplate;

describe('templatePrimaryMuscles', () => {
  it('reúne os primários dos exercícios principais', () => {
    expect(templatePrimaryMuscles(tpl('B'), seedExercises).sort()).toEqual(
      ['biceps', 'costas_medias', 'deltoide_posterior', 'dorsais'].sort(),
    );
  });
});

describe('overlapWarning', () => {
  const now = new Date('2026-03-02T09:00:00Z');
  const bMuscles = templatePrimaryMuscles(tpl('B'), seedExercises);

  it('detecta grupo primário repetido em menos de 24h', () => {
    // Ontem à tarde: treino A com rosca direta adicionada na hora (bíceps primário)
    const a = makeSession('A', at('2026-03-01', 15));
    const setLogs = [
      ...makeSets(a, 'supino-inclinado-maquina', [[40], [40]]),
      ...makeSets(a, 'rosca-direta-polia', [[20]]),
    ];
    expect(
      overlapWarning({ muscles: bMuscles, sessions: [a], setLogs, exercises: seedExercises, now }),
    ).toEqual(['biceps']);
  });

  it('não alerta para grupos secundários', () => {
    // Pulley: dorsais primário, bíceps secundário. Treino A não tem dorsais/bíceps primários.
    const b = makeSession('B', at('2026-03-01', 15));
    const setLogs = makeSets(b, 'pulley-frente', [[50], [50]]);
    const aMuscles = templatePrimaryMuscles(tpl('A'), seedExercises);
    expect(aMuscles).not.toContain('biceps');
    expect(
      overlapWarning({ muscles: aMuscles, sessions: [b], setLogs, exercises: seedExercises, now }),
    ).toEqual([]);
    // E um treino cujos primários coincidem só com secundários do pulley também não alerta.
    expect(
      overlapWarning({
        muscles: ['biceps'],
        sessions: [b],
        setLogs,
        exercises: seedExercises,
        now,
      }),
    ).toEqual([]);
  });

  it('não alerta para sessões com mais de 24h', () => {
    const b = makeSession('B', at('2026-02-28', 15)); // termina 16h do dia 28 → 41h antes
    const setLogs = makeSets(b, 'rosca-direta-polia', [[20]]);
    expect(
      overlapWarning({ muscles: bMuscles, sessions: [b], setLogs, exercises: seedExercises, now }),
    ).toEqual([]);
  });

  it('usa os exercícios efetivamente executados, não o template', () => {
    // Sessão B em que só o pulley teve séries: bíceps (rosca) foi pulado.
    const b = makeSession('B', at('2026-03-01', 15));
    const setLogs = makeSets(b, 'pulley-frente', [[50]]);
    expect(
      overlapWarning({
        muscles: ['biceps', 'dorsais'],
        sessions: [b],
        setLogs,
        exercises: seedExercises,
        now,
      }),
    ).toEqual(['dorsais']);
  });

  it('ignora sessões em andamento e descartadas', () => {
    const ongoing = makeSession('B', at('2026-03-01', 20), { status: 'em_andamento' });
    const discarded = makeSession('B', at('2026-03-01', 18), { status: 'descartada' });
    const setLogs = [
      ...makeSets(ongoing, 'rosca-direta-polia', [[20]]),
      ...makeSets(discarded, 'rosca-direta-polia', [[20]]),
    ];
    expect(
      overlapWarning({
        muscles: bMuscles,
        sessions: [ongoing, discarded],
        setLogs,
        exercises: seedExercises,
        now,
      }),
    ).toEqual([]);
  });

  it('performedPrimaryMuscles considera só a sessão pedida', () => {
    const a = makeSession('A', at('2026-03-01'));
    const c = makeSession('C', at('2026-03-01', 18));
    const logs = [...makeSets(a, 'peck-deck', [[30]]), ...makeSets(c, 'leg-press-45', [[100]])];
    expect([...performedPrimaryMuscles(a.id, logs, seedExercises)]).toEqual(['peito']);
  });
});
