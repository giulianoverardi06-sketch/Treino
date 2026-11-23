import { buildSeed } from '@/data/seedProgram';
import { BACKUP_VERSION, type Backup, type BackupImage } from '@/domain/backup';
import type { Exercise } from '@/domain/types';
import { blobToBytes } from '@/lib/blob';
import { db } from './db';

/* Exportar, importar (substituir tudo) e apagar tudo (SPEC §5.8). */

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = await blobToBytes(blob);
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

function base64ToBlob(base64: string, mime: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/**
 * Lê todas as tabelas. Sem imagens, exercícios com foto própria saem como "sem imagem" (o arquivo
 * leve não carrega blobs que ninguém conseguiria restaurar).
 */
export async function exportBackup(
  options: { includeImages: boolean; now?: Date } = { includeImages: true },
): Promise<Backup> {
  return db.transaction(
    'r',
    [db.exercises, db.templates, db.sessions, db.setLogs, db.settings, db.images],
    async () => {
      const [exercises, templates, sessions, setLogs, settings, images] = await Promise.all([
        db.exercises.toArray(),
        db.templates.toArray(),
        db.sessions.toArray(),
        db.setLogs.toArray(),
        db.settings.get('singleton'),
        options.includeImages ? db.images.toArray() : Promise.resolve([]),
      ]);
      const encoded: BackupImage[] = [];
      for (const img of images) {
        encoded.push({ id: img.id, mime: img.mime, base64: await blobToBase64(img.blob) });
      }
      const outExercises: Exercise[] = options.includeImages
        ? exercises
        : exercises.map((e) =>
            e.imageSource.kind === 'custom' ? { ...e, imageSource: { kind: 'none' } } : e,
          );
      return {
        schemaVersion: BACKUP_VERSION,
        exportedAt: (options.now ?? new Date()).toISOString(),
        exercises: outExercises,
        templates,
        sessions,
        setLogs,
        settings: settings ?? buildSeed(new Date().toISOString()).settings,
        images: encoded,
      };
    },
  );
}

const ALL_TABLES = () => [
  db.exercises,
  db.templates,
  db.sessions,
  db.setLogs,
  db.settings,
  db.images,
];

/** Substitui tudo pelo conteúdo do backup, numa transação só (ou tudo, ou nada). */
export async function importBackup(backup: Backup): Promise<void> {
  const images = backup.images.map((i) => ({
    id: i.id,
    mime: i.mime,
    blob: base64ToBlob(i.base64, i.mime),
  }));
  await db.transaction('rw', ALL_TABLES(), async () => {
    await Promise.all(ALL_TABLES().map((t) => t.clear()));
    await db.exercises.bulkAdd(backup.exercises);
    await db.templates.bulkAdd(backup.templates);
    await db.sessions.bulkAdd(backup.sessions);
    await db.setLogs.bulkAdd(backup.setLogs);
    await db.images.bulkAdd(images);
    await db.settings.put({ ...backup.settings, schemaVersion: BACKUP_VERSION });
  });
}

export async function markBackedUp(when: Date = new Date()): Promise<void> {
  await db.settings.update('singleton', { lastBackupAt: when.toISOString() });
}

/** Apaga tudo e volta ao programa inicial, como numa instalação nova. */
export async function clearAllData(): Promise<void> {
  const seed = buildSeed(new Date().toISOString());
  await db.transaction('rw', ALL_TABLES(), async () => {
    await Promise.all(ALL_TABLES().map((t) => t.clear()));
    await db.exercises.bulkAdd(seed.exercises);
    await db.templates.bulkAdd(seed.templates);
    await db.settings.add(seed.settings);
  });
}
