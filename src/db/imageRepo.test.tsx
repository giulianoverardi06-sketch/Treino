import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { ExerciseImage } from '@/components/ExerciseImage';
import { buildSeed } from '@/data/seedProgram';
import { searchExerciseDb, type ExerciseDbEntry } from '@/domain/exerciseDb';
import { fitWithin } from '@/lib/images';
import { db } from './db';
import {
  ImageError,
  removeExerciseImage,
  setExerciseImages,
  uploadExerciseImage,
} from './imageRepo';

const seed = buildSeed('2026-01-01T00:00:00.000Z');

beforeEach(async () => {
  await db.transaction('rw', db.exercises, db.images, async () => {
    await db.exercises.clear();
    await db.images.clear();
    await db.exercises.bulkAdd(seed.exercises);
  });
});

const jpg = (text: string) => new Blob([text], { type: 'image/jpeg' });

describe('fitWithin', () => {
  it('reduz o lado maior para 800 mantendo a proporção e nunca amplia', () => {
    expect(fitWithin(1600, 1200)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(900, 3000)).toEqual({ width: 240, height: 800 });
    expect(fitWithin(500, 300)).toEqual({ width: 500, height: 300 });
  });
});

describe('searchExerciseDb', () => {
  const index: ExerciseDbEntry[] = [
    {
      id: 'Side_Lateral_Raise',
      name: 'Side Lateral Raise',
      primaryMuscles: [],
      equipment: null,
      images: ['a/0.jpg'],
    },
    {
      id: 'Leg_Press',
      name: 'Leg Press',
      primaryMuscles: [],
      equipment: 'machine',
      images: ['b/0.jpg'],
    },
    { id: 'No_Image', name: 'Lateral Thing', primaryMuscles: [], equipment: null, images: [] },
    {
      id: 'Lat_Pull',
      name: 'Wide-Grip Lat Pulldown',
      primaryMuscles: [],
      equipment: null,
      images: ['c/0.jpg'],
    },
  ];

  it('todas as palavras, sem caixa, ignorando hífens; só com imagem', () => {
    expect(searchExerciseDb(index, 'LATERAL raise').map((e) => e.id)).toEqual([
      'Side_Lateral_Raise',
    ]);
    expect(searchExerciseDb(index, 'grip pulldown').map((e) => e.id)).toEqual(['Lat_Pull']);
    expect(searchExerciseDb(index, 'lateral').map((e) => e.id)).toEqual(['Side_Lateral_Raise']);
    expect(searchExerciseDb(index, '  ')).toEqual([]);
  });
});

describe('imageRepo', () => {
  it('grava fotos, aponta o exercício e apaga as anteriores ao trocar', async () => {
    await setExerciseImages('peck-deck', [jpg('a0'), jpg('a1')]);
    const first = (await db.exercises.get('peck-deck'))?.imageSource;
    expect(first).toMatchObject({ kind: 'custom' });
    expect(await db.images.count()).toBe(2);

    await setExerciseImages('peck-deck', [jpg('b0')]);
    const second = (await db.exercises.get('peck-deck'))?.imageSource;
    expect(second?.kind === 'custom' && second.altBlobId).toBeFalsy();
    expect(await db.images.count()).toBe(1);

    await removeExerciseImage('peck-deck');
    expect((await db.exercises.get('peck-deck'))?.imageSource).toEqual({ kind: 'none' });
    expect(await db.images.count()).toBe(0);
  });

  it('upload recusa arquivo que não é imagem', async () => {
    await expect(
      uploadExerciseImage('peck-deck', new Blob(['x'], { type: 'text/plain' })),
    ).rejects.toBeInstanceOf(ImageError);
  });
});

describe('ExerciseImage', () => {
  it('foto do seed vem de public/exercise-images e alterna entre as duas posições', async () => {
    const legPress = seed.exercises.find((e) => e.id === 'leg-press-45');
    render(<ExerciseImage exercise={legPress} size="large" />);
    const img = screen.getByRole('img', { name: 'Leg press 45°, posição inicial' });
    expect(img).toHaveAttribute(
      'src',
      expect.stringContaining('exercise-images/Leg_Press/0.jpg') as string,
    );
    await userEvent.click(screen.getByRole('button', { name: /mostrar posição final/ }));
    expect(screen.getByRole('img', { name: 'Leg press 45°, posição final' })).toHaveAttribute(
      'src',
      expect.stringContaining('Leg_Press/1.jpg') as string,
    );
  });

  it('sem foto mostra o grupo muscular', () => {
    const machine = seed.exercises.find((e) => e.id === 'elevacao-lateral-maquina');
    render(<ExerciseImage exercise={machine} size="large" />);
    expect(screen.getByRole('img', { name: 'Sem imagem, Deltoide lateral' })).toBeInTheDocument();
  });
});
