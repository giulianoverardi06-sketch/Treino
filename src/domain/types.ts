/**
 * Modelo de domínio (SPEC §3.2).
 * Datas são strings ISO 8601 em UTC (`toISOString()`), então comparam-se lexicograficamente.
 */

export type Letter = 'A' | 'B' | 'C';

export const LETTERS: readonly Letter[] = ['A', 'B', 'C'];

export type MuscleGroup =
  | 'peito'
  | 'peito_superior'
  | 'deltoide_anterior'
  | 'deltoide_lateral'
  | 'deltoide_posterior'
  | 'dorsais'
  | 'costas_medias'
  | 'trapezio'
  | 'biceps'
  | 'triceps'
  | 'quadriceps'
  | 'posteriores'
  | 'gluteos'
  | 'panturrilha'
  | 'core';

export type Equipment = 'maquina' | 'polia' | 'halteres' | 'barra' | 'peso_corporal' | 'outro';

export type ImageSource =
  | { kind: 'freeExerciseDb'; dbId: string }
  | {
      kind: 'custom';
      blobId: string;
      /** Segunda foto (posição final), quando existe. */ altBlobId?: string;
    }
  | { kind: 'none' };

export interface Exercise {
  id: string;
  name: string;
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  equipment: Equipment;
  imageSource: ImageSource;
  defaultIncrementKg: number;
  notes?: string;
  archived: boolean;
  createdAt: string;
}

export type SlotProtocol = 'padrao' | 'drop_lateral';

export interface Slot {
  id: string;
  label: string;
  primaryExerciseId: string;
  alternativeExerciseIds: string[];
  plannedSets: number;
  optional: boolean;
  protocol?: SlotProtocol;
  /**
   * Carga sugerida quando o exercício nunca foi feito (ex.: 8 kg na elevação lateral, SPEC §5.3).
   * Acréscimo ao SPEC.
   */
  startWeightKg?: number;
  notes?: string;
}

export interface WorkoutTemplate {
  id: string;
  letter: Letter;
  name: string;
  emphasis: string;
  slots: Slot[];
  updatedAt: string;
}

export type SessionStatus = 'em_andamento' | 'concluida' | 'descartada';

export interface Session {
  id: string;
  templateId: string;
  letter: Letter;
  startedAt: string;
  finishedAt?: string;
  status: SessionStatus;
  notes?: string;
  entries: SessionEntry[];
}

export interface SessionEntry {
  id: string;
  /** Ausente quando o exercício foi adicionado na hora. */
  slotId?: string;
  /** Principal ou alternativa: o exercício realmente feito. */
  exerciseId: string;
  order: number;
  skipped: boolean;
  /*
   * Snapshot do slot no momento da sessão (acréscimo ao SPEC): a sessão fica autossuficiente
   * mesmo se o template mudar depois ou se o exercício foi adicionado na hora.
   */
  label: string;
  plannedSets: number;
  optional: boolean;
  protocol?: SlotProtocol;
}

export type RpeNote = 'facil' | 'ok' | 'dificil';

export interface SetLog {
  id: string;
  sessionId: string;
  entryId: string;
  exerciseId: string;
  setIndex: number;
  weightKg: number;
  /** Opcional e aproximado. */
  reps?: number;
  toFailure: boolean;
  rpeNote?: RpeNote;
  note?: string;
  completedAt: string;
}

export type Theme = 'dark' | 'light' | 'system';

export interface Settings {
  id: 'singleton';
  theme: Theme;
  defaultToFailure: boolean;
  /** Redução do atalho "↓ reduzir" do protocolo lateral (SPEC §5.3/§5.8). */
  lateralDropKg: number;
  /** Manter a tela acesa durante a sessão (SPEC §5.2/§5.8). */
  wakeLock: boolean;
  lastBackupAt?: string;
  schemaVersion: number;
}

export interface StoredImage {
  id: string;
  blob: Blob;
  mime: string;
}
