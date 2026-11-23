import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Modal } from '@/components/Modal';
import { searchExerciseDb, type ExerciseDbEntry } from '@/domain/exerciseDb';
import { exerciseDbRawUrl } from '@/lib/images';

interface ExerciseDbSheetProps {
  initialQuery: string;
  busy: boolean;
  onPick: (entry: ExerciseDbEntry) => void;
  onClose: () => void;
}

/** Índice carregado sob demanda (arquivo à parte no bundle). */
let indexPromise: Promise<ExerciseDbEntry[]> | null = null;
function loadIndex(): Promise<ExerciseDbEntry[]> {
  indexPromise ??= import('@/data/exerciseDbIndex.json').then(
    (m) => m.default as ExerciseDbEntry[],
  );
  return indexPromise;
}

/** "Buscar no banco aberto" (free-exercise-db): nomes em inglês, fotos baixadas ao escolher. */
export function ExerciseDbSheet({ initialQuery, busy, onPick, onClose }: ExerciseDbSheetProps) {
  const [index, setIndex] = useState<ExerciseDbEntry[] | null>(null);
  const [query, setQuery] = useState(initialQuery);

  useEffect(() => {
    let alive = true;
    void loadIndex().then((data) => {
      if (alive) setIndex(data);
    });
    return () => {
      alive = false;
    };
  }, []);

  const results = index ? searchExerciseDb(index, query) : [];

  return (
    <Modal title="Buscar no banco aberto" onClose={onClose}>
      <p className="mb-3 text-sm text-muted">
        Fotos do free-exercise-db (domínio público), com nomes em inglês. Baixar precisa de
        internet; depois a foto fica no aparelho.
      </p>
      <label className="relative mb-3 block">
        <span className="sr-only">Buscar no banco aberto</span>
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
          }}
          placeholder="Ex.: lateral raise, leg press"
          className="h-12 w-full rounded-[3px] border-2 border-edge bg-surface pr-12 pl-3 text-base text-text"
        />
        <Search
          aria-hidden
          size={20}
          className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-muted"
        />
      </label>

      {index === null ? (
        <p className="py-6 text-center text-base text-muted">Carregando o índice…</p>
      ) : query.trim() === '' ? (
        <p className="py-6 text-center text-base text-muted">Digite o nome em inglês.</p>
      ) : results.length === 0 ? (
        <p className="py-6 text-center text-base text-muted">Nada encontrado.</p>
      ) : (
        <ul className="border-t border-border" aria-busy={busy}>
          {results.map((e) => (
            <li key={e.id} className="border-b border-border">
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  onPick(e);
                }}
                className="flex min-h-16 w-full items-center gap-3 py-2 text-left hover:bg-surface-2 disabled:opacity-50"
              >
                {e.images[0] && (
                  <img
                    src={exerciseDbRawUrl(e.images[0])}
                    alt=""
                    loading="lazy"
                    className="size-12 shrink-0 rounded-[3px] bg-white object-cover"
                    onError={(ev) => {
                      ev.currentTarget.style.visibility = 'hidden';
                    }}
                  />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-semibold">{e.name}</span>
                  <span className="block text-sm text-muted">
                    {[e.primaryMuscles.join(', '), e.equipment].filter(Boolean).join(' · ')}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
