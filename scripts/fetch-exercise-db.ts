/**
 * Baixa o free-exercise-db (yuhonas/free-exercise-db, domínio público / Unlicense) e gera
 * `src/data/exerciseDbIndex.json` só com id, name, primaryMuscles, equipment e images (SPEC §4.1).
 *
 * Uso:
 *   node scripts/fetch-exercise-db.ts           # atualiza o índice
 *   node scripts/fetch-exercise-db.ts --images  # também baixa as fotos usadas no seed para public/
 *
 * Node 24 roda TypeScript direto (remoção de tipos). Sem dependências.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAW = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');

interface DbExercise {
  id: string;
  name: string;
  primaryMuscles: string[];
  equipment: string | null;
  images: string[];
}

function isDbExercise(x: unknown): x is DbExercise {
  if (typeof x !== 'object' || x === null) return false;
  const e = x as Record<string, unknown>;
  return (
    typeof e.id === 'string' &&
    /^[A-Za-z0-9_-]+$/.test(e.id) &&
    typeof e.name === 'string' &&
    Array.isArray(e.primaryMuscles) &&
    Array.isArray(e.images)
  );
}

async function fetchIndex(): Promise<DbExercise[]> {
  const res = await fetch(`${RAW}/dist/exercises.json`);
  if (!res.ok) throw new Error(`exercises.json: HTTP ${res.status}`);
  const data: unknown = await res.json();
  if (!Array.isArray(data)) throw new Error('exercises.json não é uma lista');
  return data.filter(isDbExercise).map((e) => ({
    id: e.id,
    name: e.name,
    primaryMuscles: e.primaryMuscles.filter((m): m is string => typeof m === 'string'),
    equipment: typeof e.equipment === 'string' ? e.equipment : null,
    images: e.images.filter(
      (p): p is string => typeof p === 'string' && /^[\w\-/.]+\.jpg$/.test(p),
    ),
  }));
}

/** Ids usados no seed, lidos de src/data/seedImageMap.ts sem executar o arquivo. */
async function seedDbIds(): Promise<string[]> {
  const src = await readFile(join(root, 'src/data/seedImageMap.ts'), 'utf8');
  const ids = [...src.matchAll(/dbId:\s*'([A-Za-z0-9_-]+)'/g)].map((m) => m[1]);
  return [...new Set(ids)];
}

async function downloadImages(index: DbExercise[]) {
  const byId = new Map(index.map((e) => [e.id, e]));
  for (const id of await seedDbIds()) {
    const entry = byId.get(id);
    if (!entry) {
      console.warn(`! ${id} não existe no índice`);
      continue;
    }
    const dir = join(root, 'public/exercise-images', id);
    await mkdir(dir, { recursive: true });
    for (const [i, path] of entry.images.slice(0, 2).entries()) {
      const res = await fetch(`${RAW}/exercises/${path}`);
      if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
      await writeFile(join(dir, `${i}.jpg`), Buffer.from(await res.arrayBuffer()));
    }
    console.log(`✓ ${id}`);
  }
}

const index = await fetchIndex();
await writeFile(join(root, 'src/data/exerciseDbIndex.json'), `${JSON.stringify(index)}\n`);
console.log(`${index.length} exercícios no índice`);
if (process.argv.includes('--images')) await downloadImages(index);
