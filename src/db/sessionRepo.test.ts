import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import {
  addSessionEntry,
  addSetRow,
  confirmSet,
  discardSession,
  finishSession,
  moveSessionEntry,
  removeSetRow,
  restoreEntry,
  SessionError,
  setEntrySkipped,
  startSession,
  swapExercise,
  updateSet,
} from './sessionRepo';

beforeEach(async () => {
  await db.sessions.clear();
  await db.setLogs.clear();
});

async function started() {
  const id = await startSession('A');
  const session = await db.sessions.get(id);
  if (!session) throw new Error('sessão não criada');
  const [first, lateral] = session.entries;
  if (!first || !lateral) throw new Error('entradas');
  return { id, session, first, lateral };
}

const logsOf = (sessionId: string, entryId: string) =>
  db.setLogs
    .where('sessionId')
    .equals(sessionId)
    .filter((l) => l.entryId === entryId)
    .sortBy('setIndex');

describe('sessionRepo', () => {
  it('inicia a sessão a partir do template e não cria uma segunda em andamento', async () => {
    const { id, session } = await started();
    expect(session).toMatchObject({ letter: 'A', status: 'em_andamento' });
    expect(session.entries).toHaveLength(6);
    expect(await startSession('B')).toBe(id);
    expect(await db.sessions.count()).toBe(1);
  });

  it('cada série é gravada na hora e sobrevive a reabrir o banco', async () => {
    const { id, first } = await started();
    await confirmSet({
      sessionId: id,
      entryId: first.id,
      exerciseId: first.exerciseId,
      setIndex: 1,
      weightKg: 40,
      toFailure: true,
    });
    db.close();
    await db.open();
    const logs = await logsOf(id, first.id);
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ weightKg: 40, toFailure: true, exerciseId: first.exerciseId });
    expect(logs[0]?.reps).toBeUndefined();
  });

  it('confirmar de novo a mesma linha atualiza em vez de duplicar', async () => {
    const { id, first } = await started();
    const base = { sessionId: id, entryId: first.id, exerciseId: first.exerciseId, setIndex: 1 };
    const a = await confirmSet({ ...base, weightKg: 40, toFailure: true });
    const b = await confirmSet({ ...base, weightKg: 42.5, reps: 8, toFailure: false });
    expect(b.id).toBe(a.id);
    expect(await logsOf(id, first.id)).toEqual([b]);
  });

  it('updateSet corrige e apaga campos opcionais', async () => {
    const { id, first } = await started();
    const log = await confirmSet({
      sessionId: id,
      entryId: first.id,
      exerciseId: first.exerciseId,
      setIndex: 1,
      weightKg: 40,
      reps: 10,
      toFailure: true,
    });
    await updateSet(log.id, { weightKg: 45, reps: null, rpeNote: 'dificil' });
    const updated = await db.setLogs.get(log.id);
    expect(updated).toMatchObject({ weightKg: 45, rpeNote: 'dificil' });
    expect(updated?.reps).toBeUndefined();
  });

  it('remover uma série renumera as seguintes e desfazer restaura tudo', async () => {
    const { id, first } = await started();
    for (const [i, w] of [40, 42.5, 45].entries()) {
      await confirmSet({
        sessionId: id,
        entryId: first.id,
        exerciseId: first.exerciseId,
        setIndex: i + 1,
        weightKg: w,
        toFailure: true,
      });
    }
    const before = await logsOf(id, first.id);
    const snapshot = await removeSetRow(id, first.id, 2);

    const after = await logsOf(id, first.id);
    expect(after.map((l) => [l.setIndex, l.weightKg])).toEqual([
      [1, 40],
      [2, 45],
    ]);
    const entry = (await db.sessions.get(id))?.entries.find((e) => e.id === first.id);
    expect(entry?.plannedSets).toBe(3); // 4 planejadas − 1

    await restoreEntry(snapshot);
    expect(await logsOf(id, first.id)).toEqual(before);
    expect((await db.sessions.get(id))?.entries.find((e) => e.id === first.id)?.plannedSets).toBe(
      4,
    );
  });

  it('"+ Série" aumenta as séries planejadas só nesta sessão', async () => {
    const { id, first } = await started();
    await addSetRow(id, first.id);
    expect((await db.sessions.get(id))?.entries[0]?.plannedSets).toBe(5);
    expect((await db.templates.get('tpl-A'))?.slots[0]?.plannedSets).toBe(4);
  });

  it('trocar por alternativa muda a sessão e não o template', async () => {
    const { id, first } = await started();
    const template = await db.templates.get('tpl-A');
    await swapExercise(id, first.id, 'supino-inclinado-halteres');
    expect((await db.sessions.get(id))?.entries[0]?.exerciseId).toBe('supino-inclinado-halteres');
    expect(await db.templates.get('tpl-A')).toEqual(template);
  });

  it('não troca o exercício depois de registrar séries', async () => {
    const { id, first } = await started();
    await confirmSet({
      sessionId: id,
      entryId: first.id,
      exerciseId: first.exerciseId,
      setIndex: 1,
      weightKg: 40,
      toFailure: true,
    });
    await expect(swapExercise(id, first.id, 'supino-inclinado-halteres')).rejects.toBeInstanceOf(
      SessionError,
    );
  });

  it('pular, mover e adicionar exercício', async () => {
    const { id, first, lateral } = await started();
    await setEntrySkipped(id, lateral.id, true);
    await moveSessionEntry(id, lateral.id, -1);
    const entryId = await addSessionEntry(id, 'face-pull');
    const s = await db.sessions.get(id);
    const ordered = [...(s?.entries ?? [])].sort((a, b) => a.order - b.order);
    expect(ordered[0]).toMatchObject({ id: lateral.id, skipped: true });
    expect(ordered[1]?.id).toBe(first.id);
    expect(ordered.at(-1)).toMatchObject({ id: entryId, exerciseId: 'face-pull', order: 6 });
  });

  it('finalizar e descartar', async () => {
    const { id } = await started();
    await finishSession(id, '  boa  ');
    expect(await db.sessions.get(id)).toMatchObject({ status: 'concluida', notes: 'boa' });
    expect((await db.sessions.get(id))?.finishedAt).toBeDefined();

    const other = await startSession('B');
    await discardSession(other);
    expect((await db.sessions.get(other))?.status).toBe('descartada');
  });
});
