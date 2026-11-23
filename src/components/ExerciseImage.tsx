import { useLiveQuery } from 'dexie-react-hooks';
import { Dumbbell } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { db } from '@/db/db';
import { MUSCLE_LABELS } from '@/domain/labels';
import type { Exercise } from '@/domain/types';
import { seedImageUrl } from '@/lib/images';
import { Tile } from './Sign';

/** URL de objeto para um blob, revogada quando o blob muda ou o componente sai. */
function useBlobUrl(blob: Blob | undefined): string | undefined {
  const url = useMemo(
    () =>
      blob && typeof URL.createObjectURL === 'function' ? URL.createObjectURL(blob) : undefined,
    [blob],
  );
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );
  return url;
}

/** As (até) duas fotos do exercício: posição inicial e final. */
function useExerciseFrames(exercise: Exercise | undefined): string[] {
  const source = exercise?.imageSource;
  const blobs = useLiveQuery(async () => {
    if (source?.kind !== 'custom') return [];
    const ids = source.altBlobId ? [source.blobId, source.altBlobId] : [source.blobId];
    const rows = await db.images.bulkGet(ids);
    return rows.map((r) => r?.blob);
  }, [source?.kind, source?.kind === 'custom' ? source.blobId : '']);
  const url0 = useBlobUrl(blobs?.[0]);
  const url1 = useBlobUrl(blobs?.[1]);

  if (source?.kind === 'freeExerciseDb') {
    return [seedImageUrl(source.dbId, 0), seedImageUrl(source.dbId, 1)];
  }
  return [url0, url1].filter((u): u is string => u !== undefined);
}

interface ExerciseImageProps {
  exercise: Exercise | undefined;
  /** `compact` é a foto grande em altura reduzida (sessão: as séries vêm logo abaixo). */
  size: 'thumb' | 'compact' | 'large';
  /** Texto quando não há foto. */
  emptyHint?: string;
}

/**
 * Foto de referência do exercício. `large` alterna entre as duas posições com um toque, simulando
 * o movimento (SPEC §5.2). Sem foto: pictograma com o grupo muscular.
 */
export function ExerciseImage({
  exercise,
  size,
  emptyHint = 'Sem foto. Adicione na biblioteca.',
}: ExerciseImageProps) {
  const frames = useExerciseFrames(exercise);
  const [frame, setFrame] = useState(0);
  const [failed, setFailed] = useState<string | null>(null);
  const src = frames[frame] ?? frames[0];
  const muscle = exercise?.primaryMuscles[0];
  const name = exercise?.name ?? 'Exercício';

  if (!src || failed === src) {
    if (size === 'thumb') return <Tile icon={Dumbbell} />;
    return (
      <div
        role="img"
        aria-label={`Sem imagem${muscle ? `, ${MUSCLE_LABELS[muscle]}` : ''}`}
        className="flex h-24 items-center gap-3 rounded-[3px] bg-surface-2 px-4"
      >
        <Tile icon={Dumbbell} size="lg" />
        <div>
          <p className="text-base font-semibold">{muscle ? MUSCLE_LABELS[muscle] : name}</p>
          <p className="text-sm text-muted">{emptyHint}</p>
        </div>
      </div>
    );
  }

  const img = (
    <img
      src={src}
      alt={size === 'thumb' ? '' : `${name}, ${frame === 0 ? 'posição inicial' : 'posição final'}`}
      loading="lazy"
      decoding="async"
      onError={() => {
        setFailed(src);
      }}
      className={
        size === 'thumb'
          ? 'size-11 shrink-0 rounded-[3px] bg-white object-cover'
          : 'h-full w-full object-contain'
      }
    />
  );

  if (size === 'thumb') return img;

  const canToggle = frames.length > 1;
  return (
    <div
      className={`relative overflow-hidden rounded-[3px] bg-white ${size === 'compact' ? 'h-36' : 'h-52'}`}
    >
      {canToggle ? (
        <button
          type="button"
          className="block h-full w-full"
          aria-label={`${name}: mostrar ${frame === 0 ? 'posição final' : 'posição inicial'}`}
          onClick={() => {
            setFrame((f) => (f === 0 ? 1 : 0));
          }}
        >
          {img}
        </button>
      ) : (
        img
      )}
      {canToggle && (
        <span
          aria-hidden
          className="pointer-events-none absolute right-2 bottom-2 rounded-[2px] bg-tile px-2 py-0.5 text-sm font-bold text-on-tile num"
        >
          {frame + 1}/2
        </span>
      )}
    </div>
  );
}
