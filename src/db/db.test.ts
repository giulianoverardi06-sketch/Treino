import { afterEach, describe, expect, it } from 'vitest';
import { SEED_EXERCISES } from '@/data/seedProgram';
import { TreinoDB } from './db';

let dbs: TreinoDB[] = [];
let n = 0;
const open = (name: string) => {
  const db = new TreinoDB(name);
  dbs.push(db);
  return db;
};

afterEach(async () => {
  for (const db of dbs) await db.delete();
  dbs = [];
});

describe('banco (Dexie)', () => {
  it('na primeira abertura carrega o seed', async () => {
    const db = open(`t-${++n}`);
    expect(await db.exercises.count()).toBe(SEED_EXERCISES.length);
    expect((await db.templates.orderBy('letter').toArray()).map((t) => t.letter)).toEqual([
      'A',
      'B',
      'C',
    ]);
    expect(await db.settings.get('singleton')).toMatchObject({ defaultToFailure: true });
    expect(await db.sessions.count()).toBe(0);
  });

  it('reabrir não duplica o seed nem sobrescreve edições', async () => {
    const name = `t-${++n}`;
    const first = open(name);
    await first.templates.update('tpl-A', { name: 'Meu treino A' });
    await first.exercises.delete('peck-deck');
    first.close();

    const second = open(name);
    expect(await second.exercises.count()).toBe(SEED_EXERCISES.length - 1);
    expect((await second.templates.get('tpl-A'))?.name).toBe('Meu treino A');
  });

  it('consulta séries por exercício em ordem de data (índice composto)', async () => {
    const db = open(`t-${++n}`);
    const base = {
      sessionId: 's1',
      entryId: 'e1',
      weightKg: 40,
      toFailure: true,
    };
    await db.setLogs.bulkAdd([
      { ...base, id: 'b', exerciseId: 'x', setIndex: 2, completedAt: '2026-01-02T10:00:00Z' },
      { ...base, id: 'a', exerciseId: 'x', setIndex: 1, completedAt: '2026-01-01T10:00:00Z' },
      { ...base, id: 'c', exerciseId: 'y', setIndex: 1, completedAt: '2026-01-01T09:00:00Z' },
    ]);
    const logs = await db.setLogs
      .where('[exerciseId+completedAt]')
      .between(['x', ''], ['x', '￿'])
      .toArray();
    expect(logs.map((l) => l.id)).toEqual(['a', 'b']);
  });
});
