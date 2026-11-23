import { z } from 'zod';
import type { CardioSession, Exercise, Session, SetLog, Settings, WorkoutTemplate } from './types';

/*
 * Backup versionado (SPEC §5.8): JSON com todas as tabelas e as imagens em base64.
 * A validação usa zod; importar substitui tudo.
 */

/** 3: cardio (SPEC §12.2). Backups 1 e 2 continuam importáveis (sem cardio). */
export const BACKUP_VERSION = 3;

const letter = z.enum(['A', 'B', 'C', 'D', 'E']);
const muscle = z.enum([
  'peito',
  'peito_superior',
  'deltoide_anterior',
  'deltoide_lateral',
  'deltoide_posterior',
  'dorsais',
  'costas_medias',
  'trapezio',
  'biceps',
  'triceps',
  'quadriceps',
  'posteriores',
  'gluteos',
  'panturrilha',
  'core',
]);
const iso = z.string().min(1);

const imageSource = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('freeExerciseDb'), dbId: z.string().min(1) }),
  z.object({
    kind: z.literal('custom'),
    blobId: z.string().min(1),
    altBlobId: z.string().min(1).optional(),
  }),
  z.object({ kind: z.literal('none') }),
]);

const exercise = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  primaryMuscles: z.array(muscle),
  secondaryMuscles: z.array(muscle),
  equipment: z.enum(['maquina', 'polia', 'halteres', 'barra', 'peso_corporal', 'outro']),
  imageSource,
  defaultIncrementKg: z.number().positive(),
  notes: z.string().optional(),
  archived: z.boolean(),
  createdAt: iso,
});

const protocol = z.enum(['padrao', 'drop_lateral']);

const slot = z.object({
  id: z.string().min(1),
  label: z.string(),
  primaryExerciseId: z.string().min(1),
  alternativeExerciseIds: z.array(z.string()),
  plannedSets: z.number().int().min(0),
  optional: z.boolean(),
  protocol: protocol.optional(),
  startWeightKg: z.number().min(0).optional(),
  notes: z.string().optional(),
});

const template = z.object({
  id: z.string().min(1),
  letter,
  name: z.string(),
  emphasis: z.string(),
  slots: z.array(slot),
  updatedAt: iso,
});

const entry = z.object({
  id: z.string().min(1),
  slotId: z.string().optional(),
  exerciseId: z.string().min(1),
  order: z.number(),
  skipped: z.boolean(),
  label: z.string(),
  plannedSets: z.number().int().min(0),
  optional: z.boolean(),
  protocol: protocol.optional(),
});

const session = z.object({
  id: z.string().min(1),
  templateId: z.string(),
  letter,
  startedAt: iso,
  finishedAt: iso.optional(),
  status: z.enum(['em_andamento', 'concluida', 'descartada']),
  notes: z.string().optional(),
  entries: z.array(entry),
});

const setLog = z.object({
  id: z.string().min(1),
  sessionId: z.string().min(1),
  entryId: z.string().min(1),
  exerciseId: z.string().min(1),
  setIndex: z.number().int().min(1),
  weightKg: z.number().min(0),
  reps: z.number().int().min(0).optional(),
  toFailure: z.boolean(),
  rpeNote: z.enum(['facil', 'ok', 'dificil']).optional(),
  note: z.string().optional(),
  completedAt: iso,
});

const settings = z.object({
  id: z.literal('singleton'),
  theme: z.enum(['dark', 'light', 'system']),
  defaultToFailure: z.boolean(),
  lateralDropKg: z.number().positive(),
  wakeLock: z.boolean(),
  lastBackupAt: iso.optional(),
  schemaVersion: z.number().int(),
});

const cardio = z.object({
  id: z.string().min(1),
  activity: z.enum([
    'esteira',
    'bicicleta',
    'corrida',
    'eliptico',
    'escada',
    'natacao',
    'caminhada',
    'outro',
  ]),
  activityName: z.string().optional(),
  startedAt: iso,
  durationMin: z.number().positive(),
  distanceKm: z.number().positive().optional(),
  intensity: z.enum(['leve', 'moderada', 'forte']).optional(),
  notes: z.string().optional(),
});

const backupImage = z.object({
  id: z.string().min(1),
  mime: z.string().min(1),
  base64: z.string(),
});

export const backupSchema = z.object({
  schemaVersion: z.number().int().min(1).max(BACKUP_VERSION),
  exportedAt: iso,
  exercises: z.array(exercise),
  templates: z.array(template),
  sessions: z.array(session),
  setLogs: z.array(setLog),
  cardio: z.array(cardio).default([]),
  settings,
  images: z.array(backupImage),
});

export interface BackupImage {
  id: string;
  mime: string;
  base64: string;
}

export interface Backup {
  schemaVersion: number;
  exportedAt: string;
  exercises: Exercise[];
  templates: WorkoutTemplate[];
  sessions: Session[];
  setLogs: SetLog[];
  cardio: CardioSession[];
  settings: Settings;
  images: BackupImage[];
}

export type ParseResult = { ok: true; backup: Backup } | { ok: false; error: string };

/** Valida o texto de um arquivo de backup. A mensagem de erro é para o usuário. */
export function parseBackup(text: string): ParseResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: 'O arquivo não é um JSON válido.' };
  }
  const result = backupSchema.safeParse(json);
  if (!result.success) {
    const issue = result.error.issues[0];
    const where = issue?.path.join('.') ?? '';
    return {
      ok: false,
      error: `Não parece um backup do Treino ABC${where ? ` (campo ${where})` : ''}.`,
    };
  }
  return { ok: true, backup: result.data as Backup };
}

export interface BackupSummary {
  exportedAt: string;
  sessions: number;
  setLogs: number;
  exercises: number;
  cardio: number;
  images: number;
}

export function summarizeBackup(b: Backup): BackupSummary {
  return {
    exportedAt: b.exportedAt,
    sessions: b.sessions.filter((s) => s.status === 'concluida').length,
    setLogs: b.setLogs.length,
    exercises: b.exercises.length,
    cardio: b.cardio.length,
    images: b.images.length,
  };
}

/** `treino-backup-2026-11-22.json` (data local). */
export function backupFileName(now: Date, prefix = 'treino-backup'): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${prefix}-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}

/* ------------------------------------------------------------------ CSV */

const CSV_HEADER = [
  'data',
  'treino',
  'sessao_id',
  'exercicio',
  'serie',
  'carga_kg',
  'reps',
  'falha',
  'rpe',
  'nota',
];

function csvCell(value: string): string {
  return /[;"\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Marca de ordem de bytes: faz o Excel abrir o CSV como UTF-8. */
const BOM = String.fromCharCode(0xfeff);

const decimal = (n: number) => String(n).replace('.', ',');

/**
 * Histórico em CSV, uma linha por série (SPEC §5.8), no formato que o Excel/planilhas em pt-BR
 * abrem direto: separador `;`, vírgula decimal, BOM UTF-8. Só sessões concluídas, em ordem.
 */
export function setLogsToCsv(
  sessions: readonly Session[],
  setLogs: readonly SetLog[],
  exerciseNames: ReadonlyMap<string, string>,
): string {
  const done = new Map(sessions.filter((s) => s.status === 'concluida').map((s) => [s.id, s]));
  const rows = setLogs
    .filter((l) => done.has(l.sessionId))
    .sort((a, b) => {
      const sa = done.get(a.sessionId)?.startedAt ?? '';
      const sb = done.get(b.sessionId)?.startedAt ?? '';
      return sa.localeCompare(sb) || a.completedAt.localeCompare(b.completedAt);
    })
    .map((l) => {
      const s = done.get(l.sessionId);
      return [
        s?.startedAt.slice(0, 10) ?? '',
        s?.letter ?? '',
        l.sessionId,
        exerciseNames.get(l.exerciseId) ?? l.exerciseId,
        String(l.setIndex),
        decimal(l.weightKg),
        l.reps === undefined ? '' : String(l.reps),
        l.toFailure ? 'sim' : 'nao',
        l.rpeNote ?? '',
        l.note ?? '',
      ]
        .map(csvCell)
        .join(';');
    });
  return BOM + `${[CSV_HEADER.join(';'), ...rows].join('\r\n')}\r\n`;
}
