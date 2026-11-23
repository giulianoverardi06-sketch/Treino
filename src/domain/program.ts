import {
  LETTERS,
  MAX_WORKOUTS,
  MIN_WORKOUTS,
  type Equipment,
  type Exercise,
  type Letter,
  type MuscleGroup,
  type Slot,
  type SlotProtocol,
  type WorkoutTemplate,
} from './types';

/*
 * Regras de edição do programa (SPEC §5.6) e da biblioteca (§5.7). Funções puras: devolvem
 * novos objetos e nunca alteram os recebidos.
 */

export const MAX_PLANNED_SETS = 20;

/** Move o slot da posição `from` para `to` (índices 0..n-1). */
export function moveSlot(slots: readonly Slot[], from: number, to: number): Slot[] {
  const list = [...slots];
  if (from < 0 || from >= list.length || to < 0 || to >= list.length || from === to) return list;
  const [item] = list.splice(from, 1);
  if (item) list.splice(to, 0, item);
  return list;
}

/** Novo slot com o exercício escolhido como principal (3 séries, não opcional). */
export function createSlot(exercise: Pick<Exercise, 'id' | 'name'>, newId: () => string): Slot {
  return {
    id: newId(),
    label: exercise.name,
    primaryExerciseId: exercise.id,
    alternativeExerciseIds: [],
    plannedSets: 3,
    optional: false,
    protocol: 'padrao',
  };
}

/**
 * "Promover alternativa a principal" com um toque: a alternativa vira principal e a antiga
 * principal ocupa o lugar dela na lista de alternativas.
 */
export function promoteAlternative(slot: Slot, exerciseId: string): Slot {
  const index = slot.alternativeExerciseIds.indexOf(exerciseId);
  if (index < 0) return slot;
  const alternatives = [...slot.alternativeExerciseIds];
  alternatives[index] = slot.primaryExerciseId;
  return { ...slot, primaryExerciseId: exerciseId, alternativeExerciseIds: alternatives };
}

export interface SlotDraft {
  label: string;
  primaryExerciseId: string;
  alternativeExerciseIds: string[];
  plannedSets: number;
  optional: boolean;
  protocol: SlotProtocol;
  startWeightKg?: number | undefined;
  notes?: string | undefined;
}

export type SlotErrors = Partial<Record<'label' | 'plannedSets' | 'primaryExerciseId', string>>;

export function validateSlot(draft: SlotDraft): SlotErrors {
  const errors: SlotErrors = {};
  if (!draft.label.trim()) errors.label = 'Dê um nome ao slot.';
  if (!draft.primaryExerciseId) errors.primaryExerciseId = 'Escolha o exercício principal.';
  if (
    !Number.isInteger(draft.plannedSets) ||
    draft.plannedSets < 1 ||
    draft.plannedSets > MAX_PLANNED_SETS
  ) {
    errors.plannedSets = `Entre 1 e ${MAX_PLANNED_SETS} séries.`;
  }
  return errors;
}

/** Aplica o rascunho ao slot: limpa espaços, tira a principal e repetidas das alternativas. */
export function applySlotDraft(slot: Slot, draft: SlotDraft): Slot {
  const alternatives = [...new Set(draft.alternativeExerciseIds)].filter(
    (id) => id !== draft.primaryExerciseId,
  );
  const next: Slot = {
    id: slot.id,
    label: draft.label.trim(),
    primaryExerciseId: draft.primaryExerciseId,
    alternativeExerciseIds: alternatives,
    plannedSets: draft.plannedSets,
    optional: draft.optional,
    protocol: draft.protocol,
  };
  if (draft.startWeightKg !== undefined) next.startWeightKg = draft.startWeightKg;
  const notes = draft.notes?.trim();
  if (notes) next.notes = notes;
  return next;
}

export function slotToDraft(slot: Slot): SlotDraft {
  return {
    label: slot.label,
    primaryExerciseId: slot.primaryExerciseId,
    alternativeExerciseIds: [...slot.alternativeExerciseIds],
    plannedSets: slot.plannedSets,
    optional: slot.optional,
    protocol: slot.protocol ?? 'padrao',
    startWeightKg: slot.startWeightKg,
    notes: slot.notes,
  };
}

export interface ExerciseUsage {
  letter: Letter;
  slotLabel: string;
  role: 'principal' | 'alternativa';
}

/** Onde o exercício aparece no programa atual. */
export function exerciseUsage(
  exerciseId: string,
  templates: readonly WorkoutTemplate[],
): ExerciseUsage[] {
  const out: ExerciseUsage[] = [];
  for (const t of [...templates].sort((a, b) => a.letter.localeCompare(b.letter))) {
    for (const s of t.slots) {
      if (s.primaryExerciseId === exerciseId) {
        out.push({ letter: t.letter, slotLabel: s.label, role: 'principal' });
      } else if (s.alternativeExerciseIds.includes(exerciseId)) {
        out.push({ letter: t.letter, slotLabel: s.label, role: 'alternativa' });
      }
    }
  }
  return out;
}

/**
 * Excluir só quando o exercício nunca foi registrado e não está no programa; com histórico,
 * arquivar (SPEC §5.7). No programa, nem um nem outro sem antes tirar dos treinos.
 */
export function deletionPolicy(
  hasHistory: boolean,
  usage: readonly ExerciseUsage[],
): { canDelete: boolean; reason?: string } {
  if (usage.length > 0) {
    return { canDelete: false, reason: 'Está no programa. Tire dos treinos para poder excluir.' };
  }
  if (hasHistory) {
    return { canDelete: false, reason: 'Tem histórico. Arquive para esconder da biblioteca.' };
  }
  return { canDelete: true };
}

export interface ExerciseDraft {
  name: string;
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  equipment: Equipment;
  defaultIncrementKg: number;
  notes?: string | undefined;
}

export type ExerciseErrors = Partial<
  Record<'name' | 'primaryMuscles' | 'defaultIncrementKg', string>
>;

export const normalizeName = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();

export function validateExercise(
  draft: ExerciseDraft,
  others: readonly Pick<Exercise, 'id' | 'name' | 'archived'>[],
  selfId?: string,
): ExerciseErrors {
  const errors: ExerciseErrors = {};
  const name = normalizeName(draft.name);
  if (!name) errors.name = 'Dê um nome ao exercício.';
  else if (others.some((e) => e.id !== selfId && !e.archived && normalizeName(e.name) === name)) {
    errors.name = 'Já existe um exercício com esse nome.';
  }
  if (draft.primaryMuscles.length === 0) errors.primaryMuscles = 'Escolha ao menos um músculo.';
  if (!(draft.defaultIncrementKg > 0) || draft.defaultIncrementKg > 50) {
    errors.defaultIncrementKg = 'Incremento entre 0,25 e 50 kg.';
  }
  return errors;
}

/** Monta o exercício a partir do rascunho; secundários não repetem os primários. */
export function applyExerciseDraft(
  base: Pick<Exercise, 'id' | 'imageSource' | 'archived' | 'createdAt'>,
  draft: ExerciseDraft,
): Exercise {
  const exercise: Exercise = {
    ...base,
    name: draft.name.trim().replace(/\s+/g, ' '),
    primaryMuscles: [...new Set(draft.primaryMuscles)],
    secondaryMuscles: [...new Set(draft.secondaryMuscles)].filter(
      (m) => !draft.primaryMuscles.includes(m),
    ),
    equipment: draft.equipment,
    defaultIncrementKg: draft.defaultIncrementKg,
  };
  const notes = draft.notes?.trim();
  if (notes) exercise.notes = notes;
  return exercise;
}

export interface LibraryFilter {
  query?: string;
  muscle?: MuscleGroup | undefined;
  equipment?: Equipment | undefined;
  showArchived?: boolean;
}

/** Busca por nome (sem acento), filtro por grupo (primário ou secundário) e equipamento. */
export function filterLibrary(
  exercises: readonly Exercise[],
  filter: LibraryFilter,
  muscleLabels: Readonly<Record<MuscleGroup, string>>,
): Exercise[] {
  const q = normalizeName(filter.query ?? '');
  return exercises
    .filter((e) => filter.showArchived || !e.archived)
    .filter((e) => !filter.equipment || e.equipment === filter.equipment)
    .filter(
      (e) =>
        !filter.muscle ||
        e.primaryMuscles.includes(filter.muscle) ||
        e.secondaryMuscles.includes(filter.muscle),
    )
    .filter(
      (e) =>
        !q ||
        normalizeName(e.name).includes(q) ||
        e.primaryMuscles.some((m) => normalizeName(muscleLabels[m]).includes(q)),
    )
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

/* ---------- Rotação (SPEC §12.1) ---------- */

/** Letras que existem no programa, em ordem alfabética. */
export function rotationOf(templates: readonly Pick<WorkoutTemplate, 'letter'>[]): Letter[] {
  return LETTERS.filter((l) => templates.some((t) => t.letter === l));
}

/** Próxima letra a criar (a seguinte à última), ou `undefined` se já há o máximo. */
export function nextTemplateLetter(
  templates: readonly Pick<WorkoutTemplate, 'letter'>[],
): Letter | undefined {
  if (templates.length >= MAX_WORKOUTS) return undefined;
  const rotation = rotationOf(templates);
  const last = rotation[rotation.length - 1];
  return last === undefined ? 'A' : LETTERS[LETTERS.indexOf(last) + 1];
}

/** Treino novo, vazio, com a letra indicada. */
export function createTemplate(letter: Letter, id: string, now: string): WorkoutTemplate {
  return { id, letter, name: `Treino ${letter}`, emphasis: '', slots: [], updatedAt: now };
}

/** Letra que pode ser removida (só a última, mantendo o mínimo), ou `undefined`. */
export function removableTemplateLetter(
  templates: readonly Pick<WorkoutTemplate, 'letter'>[],
): Letter | undefined {
  if (templates.length <= MIN_WORKOUTS) return undefined;
  return rotationOf(templates).at(-1);
}
