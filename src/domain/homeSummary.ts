import { calendarDaysBetween } from '@/lib/dates';
import { lastSessionOfLetter } from './nextWorkout';
import { DEFAULT_ROTATION, type Letter, type Session, type Settings } from './types';

export interface HomeSummary {
  /** Sessões concluídas nos últimos 7 dias de calendário (hoje incluído). */
  last7: number;
  last30: number;
  /** Início da última sessão concluída de cada letra da rotação. */
  lastByLetter: Partial<Record<Letter, string | undefined>>;
}

export function homeSummary(
  sessions: readonly Session[],
  now: Date,
  rotation: readonly Letter[] = DEFAULT_ROTATION,
): HomeSummary {
  const done = sessions.filter((s) => s.status === 'concluida');
  const within = (days: number) =>
    done.filter((s) => {
      const d = calendarDaysBetween(s.startedAt, now);
      return d >= 0 && d < days;
    }).length;

  const lastByLetter: Partial<Record<Letter, string | undefined>> = {};
  for (const letter of rotation)
    lastByLetter[letter] = lastSessionOfLetter(done, letter)?.startedAt;

  return { last7: within(7), last30: within(30), lastByLetter };
}

export const BACKUP_REMINDER_DAYS = 14;

/**
 * Lembrete de backup (SPEC §5.1): nunca feito ou há mais de 14 dias. Só aparece quando já
 * existe alguma sessão concluída (sem dados, não há o que proteger).
 */
export function needsBackupReminder(
  settings: Pick<Settings, 'lastBackupAt'>,
  sessions: readonly Session[],
  now: Date,
): boolean {
  if (!sessions.some((s) => s.status === 'concluida')) return false;
  if (!settings.lastBackupAt) return true;
  return calendarDaysBetween(settings.lastBackupAt, now) > BACKUP_REMINDER_DAYS;
}
