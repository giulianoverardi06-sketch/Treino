import Dexie, { type EntityTable, type Transaction } from 'dexie';
import { buildSeed } from '@/data/seedProgram';
import type {
  Exercise,
  Session,
  SetLog,
  Settings,
  StoredImage,
  WorkoutTemplate,
} from '@/domain/types';

export const DB_NAME = 'treino-abc';

/**
 * Esquemas por versão (SPEC §3.3). Nunca edite uma versão publicada: adicione a próxima.
 *
 * Diferença do SPEC: `exercises.archived` não é indexado. Booleanos não são chaves válidas no
 * IndexedDB, então o índice ficaria sempre vazio; o filtro de arquivados é feito em memória.
 *
 * Para migrar, acrescente em `registerVersions`:
 *   db.version(2).stores({ ...mudanças }).upgrade(async (tx) => {
 *     await tx.table('exercises').toCollection().modify((e) => { ... });
 *     await tx.table('settings').update('singleton', { schemaVersion: 2 });
 *   });
 * e atualize SCHEMA_VERSION em src/data/seedProgram.ts.
 */
function registerVersions(db: Dexie) {
  db.version(1).stores({
    exercises: 'id, name',
    templates: 'id, letter',
    sessions: 'id, letter, startedAt, status',
    setLogs: 'id, sessionId, exerciseId, completedAt, [exerciseId+completedAt]',
    images: 'id',
    settings: 'id',
  });
}

/** Seed na criação do banco. O evento `populate` só dispara uma vez, dentro da transação de criação. */
async function populate(tx: Transaction) {
  const seed = buildSeed(new Date().toISOString());
  await tx.table('exercises').bulkAdd(seed.exercises);
  await tx.table('templates').bulkAdd(seed.templates);
  await tx.table('settings').add(seed.settings);
}

export class TreinoDB extends Dexie {
  declare exercises: EntityTable<Exercise, 'id'>;
  declare templates: EntityTable<WorkoutTemplate, 'id'>;
  declare sessions: EntityTable<Session, 'id'>;
  declare setLogs: EntityTable<SetLog, 'id'>;
  declare images: EntityTable<StoredImage, 'id'>;
  declare settings: EntityTable<Settings, 'id'>;

  constructor(name: string = DB_NAME) {
    super(name);
    registerVersions(this);
    this.on('populate', populate);
  }
}

export const db = new TreinoDB();
