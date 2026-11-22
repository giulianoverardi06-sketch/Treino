import type { Exercise, Session, SessionEntry, WorkoutTemplate } from './types';

/**
 * Cria uma sessão em andamento a partir do template, com snapshot dos slots.
 * O template não é modificado; mudanças posteriores nele não afetam a sessão.
 */
export function createSessionFromTemplate(
  template: WorkoutTemplate,
  now: string,
  newId: () => string,
): Session {
  const entries: SessionEntry[] = template.slots.map((slot, i) => {
    const entry: SessionEntry = {
      id: newId(),
      slotId: slot.id,
      exerciseId: slot.primaryExerciseId,
      order: i,
      skipped: false,
      label: slot.label,
      plannedSets: slot.plannedSets,
      optional: slot.optional,
    };
    if (slot.protocol) entry.protocol = slot.protocol;
    return entry;
  });

  return {
    id: newId(),
    templateId: template.id,
    letter: template.letter,
    startedAt: now,
    status: 'em_andamento',
    entries,
  };
}

/** Entrada para um exercício adicionado na hora, no fim da lista. */
export function createAdHocEntry(
  session: Session,
  exercise: Exercise,
  newId: () => string,
  plannedSets = 3,
): SessionEntry {
  const maxOrder = Math.max(-1, ...session.entries.map((e) => e.order));
  return {
    id: newId(),
    exerciseId: exercise.id,
    order: maxOrder + 1,
    skipped: false,
    label: exercise.name,
    plannedSets,
    optional: false,
    protocol: 'padrao',
  };
}

/** Entradas na ordem de execução. */
export function orderedEntries(session: Session): SessionEntry[] {
  return [...session.entries].sort((a, b) => a.order - b.order);
}

/**
 * Move uma entrada uma posição para cima (-1) ou para baixo (+1), renumerando `order` em 0..n-1.
 * Retorna a nova lista (a original não é alterada); sem efeito nas bordas.
 */
export function moveEntry(
  entries: readonly SessionEntry[],
  entryId: string,
  direction: -1 | 1,
): SessionEntry[] {
  const list = [...entries].sort((a, b) => a.order - b.order);
  const i = list.findIndex((e) => e.id === entryId);
  const j = i + direction;
  const a = list[i];
  const b = list[j];
  if (i < 0 || !a || !b) return list.map((e, k) => ({ ...e, order: k }));
  list[i] = b;
  list[j] = a;
  return list.map((e, k) => ({ ...e, order: k }));
}
