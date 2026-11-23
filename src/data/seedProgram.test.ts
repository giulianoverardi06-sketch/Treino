import { describe, expect, it } from 'vitest';
import { buildSeed } from './seedProgram';

const seed = buildSeed('2026-01-01T00:00:00.000Z');
const ids = new Set(seed.exercises.map((e) => e.id));

describe('seed do programa', () => {
  it('tem os treinos A, B e C com 6 slots cada', () => {
    expect(seed.templates.map((t) => t.letter)).toEqual(['A', 'B', 'C']);
    for (const t of seed.templates) expect(t.slots).toHaveLength(6);
  });

  it('IDs de exercícios são únicos e todos os slots apontam para exercícios existentes', () => {
    expect(ids.size).toBe(seed.exercises.length);
    for (const slot of seed.templates.flatMap((t) => t.slots)) {
      expect(ids.has(slot.primaryExerciseId), slot.primaryExerciseId).toBe(true);
      for (const alt of slot.alternativeExerciseIds) expect(ids.has(alt), alt).toBe(true);
    }
  });

  it('todo exercício do seed é usado em algum slot', () => {
    const used = new Set(
      seed.templates.flatMap((t) =>
        t.slots.flatMap((s) => [s.primaryExerciseId, ...s.alternativeExerciseIds]),
      ),
    );
    expect([...ids].filter((id) => !used.has(id))).toEqual([]);
  });

  it('IDs de slot são únicos', () => {
    const slotIds = seed.templates.flatMap((t) => t.slots.map((s) => s.id));
    expect(new Set(slotIds).size).toBe(slotIds.length);
  });

  it('marca como opcionais os slots do SPEC §4', () => {
    const optional = seed.templates.flatMap((t) =>
      t.slots.filter((s) => s.optional).map((s) => s.label),
    );
    expect(optional).toEqual([
      'Remada costas médias',
      'Bíceps complementar',
      'Extensão de quadril',
      'Core',
      'Panturrilha',
    ]);
  });

  it('elevação lateral usa o protocolo drop_lateral com 8 séries e 8 kg', () => {
    const lateral = seed.templates[0]?.slots[1];
    expect(lateral).toMatchObject({
      label: 'Deltoide lateral',
      primaryExerciseId: 'elevacao-lateral-halteres',
      plannedSets: 8,
      protocol: 'drop_lateral',
      startWeightKg: 8,
    });
  });

  it('séries planejadas seguem o SPEC', () => {
    expect(seed.templates.map((t) => t.slots.map((s) => s.plannedSets))).toEqual([
      [4, 8, 3, 3, 3, 3],
      [3, 3, 3, 3, 3, 3],
      [3, 3, 3, 3, 3, 3],
    ]);
  });

  it('exercícios começam não arquivados, com incremento positivo e foto quando há correspondência', () => {
    expect(seed.exercises.find((e) => e.id === 'leg-press-45')?.imageSource).toEqual({
      kind: 'freeExerciseDb',
      dbId: 'Leg_Press',
    });
    expect(seed.exercises.find((e) => e.id === 'elevacao-lateral-maquina')?.imageSource).toEqual({
      kind: 'none',
    });
    for (const e of seed.exercises) {
      expect(e.archived).toBe(false);
      expect(e.defaultIncrementKg).toBeGreaterThan(0);
      expect(e.primaryMuscles.length).toBeGreaterThan(0);
    }
  });

  it('configurações padrão: falha ligada, tema escuro, redução lateral de 2 kg', () => {
    expect(seed.settings).toMatchObject({
      id: 'singleton',
      theme: 'dark',
      defaultToFailure: true,
      lateralDropKg: 2,
    });
  });

  it('todo exercício do seed está no mapa de imagens e todo id existe no índice', async () => {
    const { SEED_IMAGE_MAP } = await import('./seedImageMap');
    const index = (await import('./exerciseDbIndex.json')).default as {
      id: string;
      images: string[];
    }[];
    const ids = new Map(index.map((e) => [e.id, e]));
    for (const e of seed.exercises) {
      expect(e.id in SEED_IMAGE_MAP, e.id).toBe(true);
      const match = SEED_IMAGE_MAP[e.id];
      if (match) expect(ids.get(match.dbId)?.images.length, match.dbId).toBeGreaterThanOrEqual(2);
    }
  });
});
