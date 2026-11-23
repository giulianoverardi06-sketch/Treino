import { describe, expect, it } from 'vitest';
import { seed } from '@/test/factories';
import { MUSCLE_LABELS } from './labels';
import type { Letter } from './types';
import {
  applyExerciseDraft,
  applySlotDraft,
  createSlot,
  createTemplate,
  deletionPolicy,
  exerciseUsage,
  filterLibrary,
  moveSlot,
  nextTemplateLetter,
  promoteAlternative,
  removableTemplateLetter,
  rotationOf,
  slotToDraft,
  validateExercise,
  validateSlot,
  type ExerciseDraft,
} from './program';
import type { Slot, WorkoutTemplate } from './types';

const tplA = seed.templates[0] as WorkoutTemplate;
const slot = (i: number) => tplA.slots[i] as Slot;

describe('slots', () => {
  it('moveSlot reordena sem alterar o original', () => {
    const before = tplA.slots.map((s) => s.id);
    const moved = moveSlot(tplA.slots, 0, 2);
    expect(moved.map((s) => s.id)).toEqual([before[1], before[2], before[0], ...before.slice(3)]);
    expect(tplA.slots.map((s) => s.id)).toEqual(before);
    expect(moveSlot(tplA.slots, 0, 99).map((s) => s.id)).toEqual(before);
  });

  it('createSlot usa o nome do exercício e 3 séries', () => {
    expect(createSlot({ id: 'face-pull', name: 'Face pull' }, () => 'novo')).toEqual({
      id: 'novo',
      label: 'Face pull',
      primaryExerciseId: 'face-pull',
      alternativeExerciseIds: [],
      plannedSets: 3,
      optional: false,
      protocol: 'padrao',
    });
  });

  it('promover alternativa troca de lugar com a principal', () => {
    const lateral = slot(1); // principal halteres; alternativas polia, máquina
    const promoted = promoteAlternative(lateral, 'elevacao-lateral-maquina');
    expect(promoted.primaryExerciseId).toBe('elevacao-lateral-maquina');
    expect(promoted.alternativeExerciseIds).toEqual([
      'elevacao-lateral-polia',
      'elevacao-lateral-halteres',
    ]);
    expect(promoteAlternative(lateral, 'inexistente')).toBe(lateral);
  });

  it('validateSlot exige rótulo, principal e séries entre 1 e 20', () => {
    const draft = slotToDraft(slot(0));
    expect(validateSlot(draft)).toEqual({});
    expect(
      Object.keys(
        validateSlot({ ...draft, label: '  ', plannedSets: 0, primaryExerciseId: '' }),
      ).sort(),
    ).toEqual(['label', 'plannedSets', 'primaryExerciseId']);
    expect(validateSlot({ ...draft, plannedSets: 2.5 }).plannedSets).toBeDefined();
  });

  it('applySlotDraft limpa alternativas repetidas e a própria principal', () => {
    const s = slot(0);
    const next = applySlotDraft(s, {
      ...slotToDraft(s),
      label: '  Pressão  ',
      alternativeExerciseIds: [
        'supino-inclinado-halteres',
        'supino-inclinado-halteres',
        s.primaryExerciseId,
      ],
      notes: '  ',
      startWeightKg: 30,
    });
    expect(next).toMatchObject({
      id: s.id,
      label: 'Pressão',
      alternativeExerciseIds: ['supino-inclinado-halteres'],
      startWeightKg: 30,
    });
    expect(next.notes).toBeUndefined();
  });
});

describe('biblioteca', () => {
  it('exerciseUsage lista principal e alternativa por treino', () => {
    expect(exerciseUsage('rosca-direta-barra', seed.templates)).toEqual([
      { letter: 'B', slotLabel: 'Bíceps principal', role: 'alternativa' },
    ]);
    expect(exerciseUsage('leg-press-45', seed.templates)).toEqual([
      { letter: 'C', slotLabel: 'Quadríceps composto', role: 'principal' },
    ]);
    expect(exerciseUsage('nao-usado', seed.templates)).toEqual([]);
  });

  it('com histórico arquiva; no programa não exclui; senão exclui', () => {
    expect(deletionPolicy(false, [])).toEqual({ canDelete: true });
    expect(deletionPolicy(true, []).canDelete).toBe(false);
    expect(
      deletionPolicy(false, [{ letter: 'A', slotLabel: 'x', role: 'principal' }]).canDelete,
    ).toBe(false);
  });

  const draft: ExerciseDraft = {
    name: 'Supino reto com barra',
    primaryMuscles: ['peito'],
    secondaryMuscles: ['triceps', 'peito'],
    equipment: 'barra',
    defaultIncrementKg: 2,
  };

  it('validateExercise: nome obrigatório e único (sem acento), músculo, incremento', () => {
    expect(validateExercise(draft, seed.exercises)).toEqual({});
    expect(validateExercise({ ...draft, name: 'peck  DECK' }, seed.exercises).name).toBe(
      'Já existe um exercício com esse nome.',
    );
    expect(validateExercise({ ...draft, name: 'Peck deck' }, seed.exercises, 'peck-deck')).toEqual(
      {},
    );
    expect(
      Object.keys(
        validateExercise({ ...draft, name: '', primaryMuscles: [], defaultIncrementKg: 0 }, []),
      ).sort(),
    ).toEqual(['defaultIncrementKg', 'name', 'primaryMuscles']);
  });

  it('applyExerciseDraft tira dos secundários o que já é primário', () => {
    const e = applyExerciseDraft(
      { id: 'x', imageSource: { kind: 'none' }, archived: false, createdAt: '2026-01-01' },
      { ...draft, name: ' Supino   reto ', notes: ' devagar ' },
    );
    expect(e).toMatchObject({
      name: 'Supino reto',
      secondaryMuscles: ['triceps'],
      notes: 'devagar',
    });
  });

  it('filterLibrary busca sem acento, filtra por grupo/equipamento e esconde arquivados', () => {
    const exercises = [
      ...seed.exercises,
      {
        ...(seed.exercises[0] as (typeof seed.exercises)[number]),
        id: 'old',
        name: 'Antigo',
        archived: true,
      },
    ];
    expect(filterLibrary(exercises, { query: 'triceps' }, MUSCLE_LABELS).map((e) => e.id)).toEqual(
      expect.arrayContaining(['triceps-polia-corda', 'triceps-acima-cabeca-halter']),
    );
    expect(
      filterLibrary(exercises, { muscle: 'panturrilha', equipment: 'maquina' }, MUSCLE_LABELS).map(
        (e) => e.id,
      ),
    ).toEqual(['panturrilha-em-pe-maquina', 'panturrilha-leg-press']);
    expect(filterLibrary(exercises, { query: 'antigo' }, MUSCLE_LABELS)).toEqual([]);
    expect(
      filterLibrary(exercises, { query: 'antigo', showArchived: true }, MUSCLE_LABELS),
    ).toHaveLength(1);
  });
});

describe('rotação do programa (SPEC §12.1)', () => {
  const of = (...letters: Letter[]) => letters.map((letter) => ({ letter }));

  it('rotationOf ordena e ignora repetidas', () => {
    expect(rotationOf(of('C', 'A', 'B', 'A'))).toEqual(['A', 'B', 'C']);
  });

  it('cria a letra seguinte à última, até E', () => {
    expect(nextTemplateLetter(of('A', 'B', 'C'))).toBe('D');
    expect(nextTemplateLetter(of('A', 'B', 'C', 'D'))).toBe('E');
    expect(nextTemplateLetter(of('A', 'B', 'C', 'D', 'E'))).toBeUndefined();
  });

  it('remove só a última letra e nunca abaixo de 2 treinos', () => {
    expect(removableTemplateLetter(of('A', 'B', 'C', 'D'))).toBe('D');
    expect(removableTemplateLetter(of('A', 'B', 'C'))).toBe('C');
    expect(removableTemplateLetter(of('A', 'B'))).toBeUndefined();
  });

  it('treino novo vem vazio com nome padrão', () => {
    expect(createTemplate('D', 'x', '2026-03-01T10:00:00.000Z')).toEqual({
      id: 'x',
      letter: 'D',
      name: 'Treino D',
      emphasis: '',
      slots: [],
      updatedAt: '2026-03-01T10:00:00.000Z',
    });
  });
});
