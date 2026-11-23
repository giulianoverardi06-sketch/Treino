import { beforeEach, describe, expect, it } from 'vitest';
import { buildSeed } from '@/data/seedProgram';
import { moveSlot } from '@/domain/program';
import { db } from './db';
import {
  deleteExercise,
  ProgramError,
  saveExercise,
  saveSlots,
  setExerciseArchived,
  updateTemplate,
} from './programRepo';
import { confirmSet, finishSession, startSession } from './sessionRepo';

beforeEach(async () => {
  const seed = buildSeed('2026-01-01T00:00:00.000Z');
  await db.transaction('rw', db.sessions, db.setLogs, db.templates, db.exercises, async () => {
    await db.sessions.clear();
    await db.setLogs.clear();
    await db.templates.clear();
    await db.exercises.clear();
    await db.templates.bulkAdd(seed.templates);
    await db.exercises.bulkAdd(seed.exercises);
  });
});

const draft = {
  name: 'Supino reto com barra',
  primaryMuscles: ['peito' as const],
  secondaryMuscles: [],
  equipment: 'barra' as const,
  defaultIncrementKg: 2,
};

describe('programRepo', () => {
  it('edita nome e ênfase; nome vazio mantém o anterior', async () => {
    await updateTemplate('tpl-A', { name: '  Empurrar  ', emphasis: ' Peito ' });
    expect(await db.templates.get('tpl-A')).toMatchObject({ name: 'Empurrar', emphasis: 'Peito' });
    await updateTemplate('tpl-A', { name: '   ' });
    expect((await db.templates.get('tpl-A'))?.name).toBe('Empurrar');
  });

  it('mudar o template não altera sessões passadas', async () => {
    const id = await startSession('A');
    const before = await db.sessions.get(id);
    const entry = before?.entries[0];
    if (!entry) throw new Error('seed');
    await confirmSet({
      sessionId: id,
      entryId: entry.id,
      exerciseId: entry.exerciseId,
      setIndex: 1,
      weightKg: 40,
      toFailure: true,
    });
    await finishSession(id);
    const snapshot = await db.sessions.get(id);

    const tpl = await db.templates.get('tpl-A');
    if (!tpl) throw new Error('seed');
    await saveSlots('tpl-A', moveSlot(tpl.slots, 0, 3).slice(1));
    await updateTemplate('tpl-A', { name: 'Outro nome' });

    expect(await db.sessions.get(id)).toEqual(snapshot);
    expect(await db.setLogs.where('sessionId').equals(id).count()).toBe(1);
  });

  it('cria e atualiza exercício', async () => {
    const id = await saveExercise(draft);
    expect(await db.exercises.get(id)).toMatchObject({
      name: 'Supino reto com barra',
      archived: false,
      imageSource: { kind: 'none' },
    });
    await saveExercise({ ...draft, name: 'Supino reto', defaultIncrementKg: 2.5 }, id);
    expect(await db.exercises.get(id)).toMatchObject({
      name: 'Supino reto',
      defaultIncrementKg: 2.5,
    });
  });

  it('exclui só exercício sem histórico e fora do programa; senão pede para arquivar', async () => {
    const free = await saveExercise(draft);
    await deleteExercise(free);
    expect(await db.exercises.get(free)).toBeUndefined();

    await expect(deleteExercise('leg-press-45')).rejects.toBeInstanceOf(ProgramError);

    const withHistory = await saveExercise({ ...draft, name: 'Com histórico' });
    await db.setLogs.add({
      id: 'l1',
      sessionId: 's',
      entryId: 'e',
      exerciseId: withHistory,
      setIndex: 1,
      weightKg: 10,
      toFailure: true,
      completedAt: '2026-01-02T00:00:00Z',
    });
    await expect(deleteExercise(withHistory)).rejects.toThrow(/Arquive/);
    await setExerciseArchived(withHistory, true);
    expect((await db.exercises.get(withHistory))?.archived).toBe(true);
  });
});
