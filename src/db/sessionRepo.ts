import { createAdHocEntry, createSessionFromTemplate, moveEntry } from '@/domain/sessionFactory';
import type { Letter, RpeNote, Session, SessionEntry, SetLog } from '@/domain/types';
import { newId } from '@/lib/ids';
import { db } from './db';

/**
 * Operações da sessão ativa. Cada ação grava na hora (SPEC §5.2 "Resiliência"):
 * não existe "salvar" global, e fechar o app não perde séries confirmadas.
 */

const nowIso = () => new Date().toISOString();

export class SessionError extends Error {}

async function getSessionOrThrow(sessionId: string): Promise<Session> {
  const session = await db.sessions.get(sessionId);
  if (!session) throw new SessionError('Sessão não encontrada');
  return session;
}

async function updateEntries(
  sessionId: string,
  fn: (entries: SessionEntry[]) => SessionEntry[],
): Promise<void> {
  await db.transaction('rw', db.sessions, async () => {
    const session = await getSessionOrThrow(sessionId);
    await db.sessions.update(sessionId, { entries: fn(session.entries) });
  });
}

const patchEntry = (entryId: string, patch: Partial<SessionEntry>) => (entries: SessionEntry[]) =>
  entries.map((e) => (e.id === entryId ? { ...e, ...patch } : e));

export async function findSessionInProgress(): Promise<Session | undefined> {
  return db.sessions.where('status').equals('em_andamento').first();
}

/**
 * Inicia o treino da letra. Se já existe sessão em andamento, devolve ela (nunca duas ao mesmo
 * tempo). O template é só lido.
 */
export async function startSession(letter: Letter): Promise<string> {
  return db.transaction('rw', db.sessions, db.templates, async () => {
    const current = await findSessionInProgress();
    if (current) return current.id;
    const template = await db.templates.where('letter').equals(letter).first();
    if (!template) throw new SessionError(`Treino ${letter} não encontrado`);
    const session = createSessionFromTemplate(template, nowIso(), newId);
    await db.sessions.add(session);
    return session.id;
  });
}

export interface ConfirmSetInput {
  sessionId: string;
  entryId: string;
  exerciseId: string;
  setIndex: number;
  weightKg: number;
  reps?: number;
  toFailure: boolean;
}

/** Grava a série. Se a linha já tinha registro, atualiza. */
export async function confirmSet(input: ConfirmSetInput): Promise<SetLog> {
  return db.transaction('rw', db.setLogs, async () => {
    const existing = await db.setLogs
      .where('sessionId')
      .equals(input.sessionId)
      .filter((l) => l.entryId === input.entryId && l.setIndex === input.setIndex)
      .first();
    const log: SetLog = {
      id: existing?.id ?? newId(),
      sessionId: input.sessionId,
      entryId: input.entryId,
      exerciseId: input.exerciseId,
      setIndex: input.setIndex,
      weightKg: input.weightKg,
      toFailure: input.toFailure,
      completedAt: existing?.completedAt ?? nowIso(),
    };
    if (input.reps !== undefined) log.reps = input.reps;
    if (existing?.rpeNote) log.rpeNote = existing.rpeNote;
    if (existing?.note) log.note = existing.note;
    await db.setLogs.put(log);
    return log;
  });
}

export interface SetPatch {
  weightKg?: number;
  reps?: number | null;
  toFailure?: boolean;
  rpeNote?: RpeNote | null;
}

/** Corrige uma série já registrada. `null` apaga o campo opcional. */
export async function updateSet(setId: string, patch: SetPatch): Promise<void> {
  await db.transaction('rw', db.setLogs, async () => {
    const log = await db.setLogs.get(setId);
    if (!log) return;
    const next: SetLog = { ...log };
    if (patch.weightKg !== undefined) next.weightKg = patch.weightKg;
    if (patch.toFailure !== undefined) next.toFailure = patch.toFailure;
    if (patch.reps === null) delete next.reps;
    else if (patch.reps !== undefined) next.reps = patch.reps;
    if (patch.rpeNote === null) delete next.rpeNote;
    else if (patch.rpeNote !== undefined) next.rpeNote = patch.rpeNote;
    await db.setLogs.put(next);
  });
}

export async function addSetRow(sessionId: string, entryId: string): Promise<void> {
  await updateEntries(sessionId, (entries) =>
    entries.map((e) => (e.id === entryId ? { ...e, plannedSets: e.plannedSets + 1 } : e)),
  );
}

/** Estado de uma entrada para "desfazer" a remoção de uma série. */
export interface EntrySnapshot {
  sessionId: string;
  entryId: string;
  plannedSets: number;
  logs: SetLog[];
}

/**
 * Remove a linha `setIndex` (registrada ou não): apaga o registro, renumera as seguintes e
 * diminui as séries planejadas desta sessão. Devolve o snapshot para desfazer.
 */
export async function removeSetRow(
  sessionId: string,
  entryId: string,
  setIndex: number,
): Promise<EntrySnapshot> {
  return db.transaction('rw', db.sessions, db.setLogs, async () => {
    const session = await getSessionOrThrow(sessionId);
    const entry = session.entries.find((e) => e.id === entryId);
    if (!entry) throw new SessionError('Exercício não encontrado na sessão');

    const logs = await db.setLogs
      .where('sessionId')
      .equals(sessionId)
      .filter((l) => l.entryId === entryId)
      .toArray();
    const snapshot: EntrySnapshot = { sessionId, entryId, plannedSets: entry.plannedSets, logs };

    const removed = logs.find((l) => l.setIndex === setIndex);
    if (removed) await db.setLogs.delete(removed.id);
    const shifted = logs
      .filter((l) => l.setIndex > setIndex)
      .map((l) => ({ ...l, setIndex: l.setIndex - 1 }));
    await db.setLogs.bulkPut(shifted);

    await db.sessions.update(sessionId, {
      entries: patchEntry(entryId, { plannedSets: Math.max(0, entry.plannedSets - 1) })(
        session.entries,
      ),
    });
    return snapshot;
  });
}

export async function restoreEntry(snapshot: EntrySnapshot): Promise<void> {
  await db.transaction('rw', db.sessions, db.setLogs, async () => {
    const session = await getSessionOrThrow(snapshot.sessionId);
    const current = await db.setLogs
      .where('sessionId')
      .equals(snapshot.sessionId)
      .filter((l) => l.entryId === snapshot.entryId)
      .primaryKeys();
    await db.setLogs.bulkDelete(current);
    await db.setLogs.bulkAdd(snapshot.logs);
    await db.sessions.update(snapshot.sessionId, {
      entries: patchEntry(snapshot.entryId, { plannedSets: snapshot.plannedSets })(session.entries),
    });
  });
}

async function entryHasLogs(sessionId: string, entryId: string): Promise<boolean> {
  const n = await db.setLogs
    .where('sessionId')
    .equals(sessionId)
    .filter((l) => l.entryId === entryId)
    .count();
  return n > 0;
}

/**
 * Troca o exercício da entrada (principal ↔ alternativa) só nesta sessão; o template não muda.
 * Bloqueado se já há séries registradas, para não misturar exercícios no histórico.
 */
export async function swapExercise(
  sessionId: string,
  entryId: string,
  exerciseId: string,
): Promise<void> {
  if (await entryHasLogs(sessionId, entryId)) {
    throw new SessionError('Remova as séries registradas antes de trocar o exercício');
  }
  await updateEntries(sessionId, patchEntry(entryId, { exerciseId }));
}

export async function setEntrySkipped(
  sessionId: string,
  entryId: string,
  skipped: boolean,
): Promise<void> {
  await updateEntries(sessionId, patchEntry(entryId, { skipped }));
}

export async function moveSessionEntry(
  sessionId: string,
  entryId: string,
  direction: -1 | 1,
): Promise<void> {
  await updateEntries(sessionId, (entries) => moveEntry(entries, entryId, direction));
}

/** "+ Exercício": adiciona um exercício da biblioteca no fim. Devolve o id da entrada. */
export async function addSessionEntry(sessionId: string, exerciseId: string): Promise<string> {
  return db.transaction('rw', db.sessions, db.exercises, async () => {
    const session = await getSessionOrThrow(sessionId);
    const exercise = await db.exercises.get(exerciseId);
    if (!exercise) throw new SessionError('Exercício não encontrado');
    const entry = createAdHocEntry(session, exercise, newId);
    await db.sessions.update(sessionId, { entries: [...session.entries, entry] });
    return entry.id;
  });
}

export async function finishSession(sessionId: string, notes?: string): Promise<void> {
  await db.transaction('rw', db.sessions, async () => {
    const session = await getSessionOrThrow(sessionId);
    const next: Session = { ...session, status: 'concluida', finishedAt: nowIso() };
    const trimmed = notes?.trim();
    if (trimmed) next.notes = trimmed;
    else delete next.notes;
    await db.sessions.put(next);
  });
}

/** Descarta a sessão. As séries ficam guardadas, mas sessões descartadas não contam em nada. */
export async function discardSession(sessionId: string): Promise<void> {
  await db.sessions.update(sessionId, { status: 'descartada', finishedAt: nowIso() });
}

/** Exclui a sessão e todas as séries dela (histórico). Não tem desfazer. */
export async function deleteSession(sessionId: string): Promise<void> {
  await db.transaction('rw', db.sessions, db.setLogs, async () => {
    await db.setLogs.where('sessionId').equals(sessionId).delete();
    await db.sessions.delete(sessionId);
  });
}

export async function updateSessionNotes(sessionId: string, notes: string): Promise<void> {
  await db.transaction('rw', db.sessions, async () => {
    const session = await getSessionOrThrow(sessionId);
    const next: Session = { ...session };
    const trimmed = notes.trim();
    if (trimmed) next.notes = trimmed;
    else delete next.notes;
    await db.sessions.put(next);
  });
}
