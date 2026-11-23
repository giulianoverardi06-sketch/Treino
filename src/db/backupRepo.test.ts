// @vitest-environment node
// Blobs no IndexedDB falso precisam do structuredClone nativo do Node (o do jsdom os perde).
import { beforeEach, describe, expect, it } from 'vitest';
import { buildSeed } from '@/data/seedProgram';
import { parseBackup } from '@/domain/backup';
import { clearAllData, exportBackup, importBackup, markBackedUp } from './backupRepo';
import { blobToBytes } from '@/lib/blob';
import { saveCardio } from './cardioRepo';
import { db } from './db';
import { setExerciseImages } from './imageRepo';
import { confirmSet, finishSession, startSession } from './sessionRepo';

async function resetToSeed() {
  await clearAllData();
  await db.sessions.clear();
  await db.setLogs.clear();
}

/** Estado com um pouco de tudo: sessão concluída, séries, template editado, foto própria. */
async function populate() {
  const id = await startSession('A');
  const s = await db.sessions.get(id);
  const entry = s?.entries[0];
  if (!entry) throw new Error('seed');
  for (const [i, w] of [42.5, 40].entries()) {
    await confirmSet({
      sessionId: id,
      entryId: entry.id,
      exerciseId: entry.exerciseId,
      setIndex: i + 1,
      weightKg: w,
      toFailure: i === 0,
      ...(i === 0 ? { reps: 10 } : {}),
    });
  }
  await finishSession(id, 'boa');
  await db.templates.update('tpl-B', { name: 'Puxar' });
  await setExerciseImages('peck-deck', [
    new Blob([new Uint8Array([1, 2, 3, 250])], { type: 'image/jpeg' }),
    new Blob([new Uint8Array([9, 8])], { type: 'image/jpeg' }),
  ]);
  await saveCardio({
    activity: 'outro',
    activityName: 'Remo',
    date: '2026-03-01',
    time: '18:30',
    durationMin: '25',
    distanceKm: '5,2',
    intensity: 'forte',
    notes: '',
  });
  await markBackedUp(new Date('2026-03-01T00:00:00Z'));
}

const stripTime = (b: Awaited<ReturnType<typeof exportBackup>>) => ({ ...b, exportedAt: 'x' });

beforeEach(resetToSeed);

describe('backup', () => {
  it('exportar → importar é idempotente (contagens e valores, inclusive imagens)', async () => {
    await populate();
    const first = await exportBackup({ includeImages: true });
    expect(first.images).toHaveLength(2);
    expect(first.sessions).toHaveLength(1);
    expect(first.setLogs).toHaveLength(2);
    expect(first.cardio).toMatchObject([{ activityName: 'Remo', distanceKm: 5.2 }]);

    // O arquivo passa por texto e pela validação, como no app.
    const parsed = parseBackup(JSON.stringify(first));
    if (!parsed.ok) throw new Error(parsed.error);

    await clearAllData();
    expect(await db.sessions.count()).toBe(0);
    await importBackup(parsed.backup);

    const second = await exportBackup({ includeImages: true });
    expect(stripTime(second)).toEqual(stripTime(first));
    const img = await db.images.toArray();
    expect(await blobToBytes(img.find((i) => i.blob.size === 4)?.blob ?? new Blob())).toEqual(
      new Uint8Array([1, 2, 3, 250]),
    );
  });

  it('exportar sem imagens tira as fotos próprias e mantém o resto', async () => {
    await populate();
    const light = await exportBackup({ includeImages: false });
    expect(light.images).toEqual([]);
    expect(light.exercises.find((e) => e.id === 'peck-deck')?.imageSource).toEqual({
      kind: 'none',
    });
    expect(light.exercises.find((e) => e.id === 'leg-press-45')?.imageSource.kind).toBe(
      'freeExerciseDb',
    );
    expect(light.setLogs).toHaveLength(2);
  });

  it('apagar tudo volta ao programa inicial', async () => {
    await populate();
    await clearAllData();
    const seed = buildSeed('x');
    expect(await db.sessions.count()).toBe(0);
    expect(await db.setLogs.count()).toBe(0);
    expect(await db.images.count()).toBe(0);
    expect(await db.cardio.count()).toBe(0);
    expect(await db.exercises.count()).toBe(seed.exercises.length);
    expect((await db.templates.get('tpl-B'))?.name).toBe('Costas e bíceps');
    expect((await db.settings.get('singleton'))?.lastBackupAt).toBeUndefined();
  });

  it('marca a data do último backup', async () => {
    await markBackedUp(new Date('2026-04-02T12:00:00Z'));
    expect((await db.settings.get('singleton'))?.lastBackupAt).toBe('2026-04-02T12:00:00.000Z');
  });
});
