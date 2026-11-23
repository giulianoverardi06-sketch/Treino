import { describe, expect, it } from 'vitest';
import { at, makeSession, makeSets, seed } from '@/test/factories';
import {
  BACKUP_VERSION,
  backupFileName,
  parseBackup,
  setLogsToCsv,
  summarizeBackup,
  type Backup,
} from './backup';

function sample(): Backup {
  const done = makeSession('A', at('2026-03-01'));
  const discarded = makeSession('B', at('2026-03-02'), { status: 'descartada' });
  return {
    schemaVersion: BACKUP_VERSION,
    exportedAt: '2026-03-03T10:00:00.000Z',
    exercises: seed.exercises,
    templates: seed.templates,
    sessions: [done, discarded],
    setLogs: [
      ...makeSets(done, 'peck-deck', [[42.5, 10], [40]]),
      ...makeSets(discarded, 'pulley-frente', [[50]]),
    ],
    cardio: [
      {
        id: 'c1',
        activity: 'esteira',
        startedAt: '2026-03-02T21:00:00.000Z',
        durationMin: 30,
        distanceKm: 4.5,
        intensity: 'moderada',
      },
    ],
    settings: { ...seed.settings, lastBackupAt: '2026-02-01T00:00:00.000Z' },
    images: [{ id: 'img', mime: 'image/jpeg', base64: 'AAEC' }],
  };
}

describe('parseBackup', () => {
  it('aceita um backup válido e devolve os mesmos dados', () => {
    const b = sample();
    const result = parseBackup(JSON.stringify(b));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.backup).toEqual(b);
  });

  it('recusa JSON inválido e arquivo de outro formato com mensagem clara', () => {
    expect(parseBackup('{oops')).toEqual({ ok: false, error: 'O arquivo não é um JSON válido.' });
    const other = parseBackup(JSON.stringify({ foo: 1 }));
    expect(other.ok).toBe(false);
    if (!other.ok) expect(other.error).toMatch(/Não parece um backup do Treino ABC/);
  });

  it('recusa versão mais nova que a do app e valores fora do formato', () => {
    expect(parseBackup(JSON.stringify({ ...sample(), schemaVersion: BACKUP_VERSION + 1 })).ok).toBe(
      false,
    );
    const bad = sample();
    (bad.setLogs[0] as { weightKg: unknown }).weightKg = 'quarenta';
    const result = parseBackup(JSON.stringify(bad));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/setLogs\.0\.weightKg/);
  });
});

describe('versões antigas', () => {
  it('backup da versão 2 (sem cardio) continua importável, com cardio vazio', () => {
    const old: Partial<Backup> = { ...sample(), schemaVersion: 2 };
    delete old.cardio;
    const result = parseBackup(JSON.stringify(old));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.backup.cardio).toEqual([]);
  });

  it('aceita letras D e E', () => {
    const b = sample();
    const [first] = b.templates;
    if (!first) throw new Error('seed');
    b.templates = [...b.templates, { ...first, id: 'tpl-x', letter: 'E' }];
    expect(parseBackup(JSON.stringify(b)).ok).toBe(true);
  });
});

describe('resumo, nome e CSV', () => {
  it('resumo conta sessões concluídas, séries, exercícios e imagens', () => {
    expect(summarizeBackup(sample())).toEqual({
      exportedAt: '2026-03-03T10:00:00.000Z',
      sessions: 1,
      setLogs: 3,
      exercises: 39,
      cardio: 1,
      images: 1,
    });
  });

  it('nome do arquivo com a data local', () => {
    expect(backupFileName(new Date(2026, 10, 2, 23, 30))).toBe('treino-backup-2026-11-02.json');
  });

  it('CSV: uma linha por série de sessão concluída, ; e vírgula decimal, BOM', () => {
    const b = sample();
    const names = new Map(b.exercises.map((e) => [e.id, e.name]));
    const csv = setLogsToCsv(b.sessions, b.setLogs, names);
    expect(csv.startsWith('﻿')).toBe(true);
    const lines = csv.slice(1).trim().split('\r\n');
    expect(lines[0]).toBe('data;treino;sessao_id;exercicio;serie;carga_kg;reps;falha;rpe;nota');
    expect(lines).toHaveLength(3); // descartada fica de fora
    expect(lines[1]).toMatch(/^2026-03-01;A;s-\d+;Peck deck;1;42,5;10;sim;;$/);
    expect(lines[2]).toMatch(/;Peck deck;2;40;;sim;;$/);
  });

  it('CSV escapa ; e aspas', () => {
    const s = makeSession('A', at('2026-03-01'));
    const [log] = makeSets(s, 'x', [[10]]);
    if (!log) throw new Error('set');
    const csv = setLogsToCsv([s], [{ ...log, note: 'pegada "aberta"; devagar' }], new Map());
    expect(csv).toContain('"pegada ""aberta""; devagar"');
  });
});
