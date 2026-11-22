import { useLiveQuery } from 'dexie-react-hooks';
import { DEFAULT_SETTINGS } from '@/data/seedProgram';
import { db } from '@/db/db';
import type { Exercise, Session, SetLog, Settings, WorkoutTemplate } from '@/domain/types';

export interface SessionData {
  session: Session;
  template: WorkoutTemplate | undefined;
  settings: Settings;
  exercises: ReadonlyMap<string, Exercise>;
  /** Todas as sessões (para referência da última vez). */
  sessions: Session[];
  /** Séries de todos os tempos dos exercícios presentes nesta sessão. */
  historyLogs: SetLog[];
  /** Séries desta sessão. */
  sessionLogs: SetLog[];
}

/** `undefined` = carregando; `null` = sessão não existe. Reage a qualquer gravação. */
export function useSessionData(sessionId: string): SessionData | null | undefined {
  return useLiveQuery(async () => {
    const session = await db.sessions.get(sessionId);
    if (!session) return null;
    const exerciseIds = [...new Set(session.entries.map((e) => e.exerciseId))];
    const [template, settings, exercises, sessions, historyLogs, sessionLogs] = await Promise.all([
      db.templates.get(session.templateId),
      db.settings.get('singleton'),
      db.exercises.toArray(),
      db.sessions.toArray(),
      db.setLogs.where('exerciseId').anyOf(exerciseIds).toArray(),
      db.setLogs.where('sessionId').equals(sessionId).toArray(),
    ]);
    return {
      session,
      template,
      settings: settings ?? DEFAULT_SETTINGS,
      exercises: new Map(exercises.map((e) => [e.id, e])),
      sessions,
      historyLogs,
      sessionLogs,
    };
  }, [sessionId]);
}
