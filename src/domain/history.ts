import type { CardioSession, Letter, Session, SetLog } from './types';

export interface HistoryItem {
  session: Session;
  exercisesDone: number;
  totalSets: number;
  /** Minutos entre início e fim; ausente se a sessão não terminou. */
  durationMin?: number;
}

export interface HistoryFilter {
  letter?: Letter;
}

/**
 * Lista do histórico (SPEC §5.4): sessões concluídas, da mais recente para a mais antiga,
 * opcionalmente filtradas por letra. Em andamento e descartadas ficam de fora.
 */
export function historyItems(
  sessions: readonly Session[],
  setLogs: readonly SetLog[],
  filter: HistoryFilter = {},
): HistoryItem[] {
  const bySession = new Map<string, SetLog[]>();
  for (const l of setLogs) {
    const list = bySession.get(l.sessionId);
    if (list) list.push(l);
    else bySession.set(l.sessionId, [l]);
  }

  return sessions
    .filter((s) => s.status === 'concluida' && (!filter.letter || s.letter === filter.letter))
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .map((session) => {
      const logs = bySession.get(session.id) ?? [];
      const item: HistoryItem = {
        session,
        exercisesDone: new Set(logs.map((l) => l.entryId)).size,
        totalSets: logs.length,
      };
      if (session.finishedAt) {
        item.durationMin = Math.max(
          0,
          Math.round((Date.parse(session.finishedAt) - Date.parse(session.startedAt)) / 60_000),
        );
      }
      return item;
    });
}

export interface MonthGroup<T> {
  /** "2026-03" (fuso local). */
  key: string;
  items: T[];
}

/** Agrupa por mês (fuso local) mantendo a ordem de entrada. */
export function groupByMonth<T>(items: readonly T[], dateOf: (item: T) => string): MonthGroup<T>[] {
  const groups: MonthGroup<T>[] = [];
  for (const item of items) {
    const d = new Date(dateOf(item));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const last = groups.at(-1);
    if (last?.key === key) last.items.push(item);
    else groups.push({ key, items: [item] });
  }
  return groups;
}

/** Linha do histórico: treino da rotação ou cardio avulso (SPEC §12.2). */
export type TimelineItem =
  | { kind: 'treino'; at: string; item: HistoryItem }
  | { kind: 'cardio'; at: string; cardio: CardioSession };

/** Junta treinos e cardio, do mais recente para o mais antigo. */
export function mergeTimeline(
  items: readonly HistoryItem[],
  cardio: readonly CardioSession[],
): TimelineItem[] {
  return [
    ...items.map((item) => ({ kind: 'treino' as const, at: item.session.startedAt, item })),
    ...cardio.map((c) => ({ kind: 'cardio' as const, at: c.startedAt, cardio: c })),
  ].sort((a, b) => b.at.localeCompare(a.at));
}
