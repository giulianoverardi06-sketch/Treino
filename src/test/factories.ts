import { buildSeed } from '@/data/seedProgram';
import type { Exercise, Letter, Session, SetLog } from '@/domain/types';

let seq = 0;
const nextId = (prefix: string) => `${prefix}-${++seq}`;

/** ISO de `YYYY-MM-DD` às `hh:00` em UTC. */
export const at = (day: string, hour = 10) => `${day}T${String(hour).padStart(2, '0')}:00:00.000Z`;

export function makeSession(
  letter: Letter,
  startedAt: string,
  overrides: Partial<Session> = {},
): Session {
  const status = overrides.status ?? 'concluida';
  const session: Session = {
    id: nextId('s'),
    templateId: `tpl-${letter}`,
    letter,
    startedAt,
    status,
    entries: [],
    ...overrides,
  };
  if (status === 'concluida' && session.finishedAt === undefined) {
    session.finishedAt = new Date(Date.parse(startedAt) + 3_600_000).toISOString();
  }
  return session;
}

export function makeSet(
  session: Session,
  exerciseId: string,
  setIndex: number,
  weightKg: number,
  extra: Partial<SetLog> = {},
): SetLog {
  return {
    id: nextId('set'),
    sessionId: session.id,
    entryId: `${session.id}-${exerciseId}`,
    exerciseId,
    setIndex,
    weightKg,
    toFailure: true,
    completedAt: new Date(Date.parse(session.startedAt) + setIndex * 120_000).toISOString(),
    ...extra,
  };
}

/** Várias séries de uma vez: `[[peso, reps?], ...]`. */
export function makeSets(
  session: Session,
  exerciseId: string,
  sets: readonly (readonly [number, number?])[],
): SetLog[] {
  return sets.map(([w, reps], i) =>
    makeSet(session, exerciseId, i + 1, w, reps === undefined ? {} : { reps }),
  );
}

export const seed = buildSeed('2026-01-01T00:00:00.000Z');
export const seedExercises: ReadonlyMap<string, Exercise> = new Map(
  seed.exercises.map((e) => [e.id, e]),
);
