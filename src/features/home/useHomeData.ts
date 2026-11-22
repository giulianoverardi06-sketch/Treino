import { useLiveQuery } from 'dexie-react-hooks';
import { DEFAULT_SETTINGS } from '@/data/seedProgram';
import { db } from '@/db/db';
import type { Exercise, Session, SetLog, Settings, WorkoutTemplate } from '@/domain/types';
import { HOUR_MS } from '@/lib/dates';

export interface HomeData {
  /** Momento da leitura (fora do render, para manter o componente puro). */
  now: Date;
  sessions: Session[];
  templates: WorkoutTemplate[];
  settings: Settings;
  exercises: ReadonlyMap<string, Exercise>;
  /** Séries das sessões concluídas nas últimas 24h (aviso de sobreposição). */
  recentLogs: SetLog[];
  /** Séries já registradas na sessão em andamento. */
  currentSetCount: number;
}

export function useHomeData(): HomeData | undefined {
  return useLiveQuery(async () => {
    const now = new Date();
    const [sessions, templates, settings, exercises] = await Promise.all([
      db.sessions.toArray(),
      db.templates.orderBy('letter').toArray(),
      db.settings.get('singleton'),
      db.exercises.toArray(),
    ]);
    const since = now.getTime() - 24 * HOUR_MS;
    const recentIds = sessions
      .filter((s) => s.status === 'concluida' && s.finishedAt && Date.parse(s.finishedAt) >= since)
      .map((s) => s.id);
    const current = sessions.find((s) => s.status === 'em_andamento');
    const [recentLogs, currentSetCount] = await Promise.all([
      db.setLogs.where('sessionId').anyOf(recentIds).toArray(),
      current ? db.setLogs.where('sessionId').equals(current.id).count() : Promise.resolve(0),
    ]);
    return {
      now,
      sessions,
      templates,
      settings: settings ?? DEFAULT_SETTINGS,
      exercises: new Map(exercises.map((e) => [e.id, e])),
      recentLogs,
      currentSetCount,
    };
  });
}
