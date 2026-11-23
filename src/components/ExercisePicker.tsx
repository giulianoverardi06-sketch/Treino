import { Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { MUSCLE_LABELS } from '@/domain/labels';
import { filterLibrary } from '@/domain/program';
import type { Exercise } from '@/domain/types';

interface ExercisePickerProps {
  exercises: ReadonlyMap<string, Exercise> | readonly Exercise[];
  onPick: (exerciseId: string) => void;
  /** Ids que não aparecem (ex.: já escolhidos). */
  exclude?: readonly string[];
}

/** Busca + lista da biblioteca (sem arquivados) para escolher um exercício. */
export function ExercisePicker({ exercises, onPick, exclude = [] }: ExercisePickerProps) {
  const [query, setQuery] = useState('');
  const all = Array.isArray(exercises)
    ? (exercises as readonly Exercise[])
    : [...(exercises as ReadonlyMap<string, Exercise>).values()];
  const list = filterLibrary(all, { query }, MUSCLE_LABELS).filter((e) => !exclude.includes(e.id));

  return (
    <>
      <label className="relative mb-3 block">
        <span className="sr-only">Buscar exercício</span>
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
          }}
          placeholder="Nome ou grupo muscular"
          className="h-12 w-full rounded-[3px] border-2 border-edge bg-surface pr-12 pl-3 text-base text-text"
        />
        <Search
          aria-hidden
          size={20}
          className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-muted"
        />
      </label>
      {list.length === 0 ? (
        <p className="py-6 text-center text-base text-muted">Nenhum exercício encontrado.</p>
      ) : (
        <ul className="border-t border-border">
          {list.map((e) => (
            <li key={e.id} className="border-b border-border">
              <button
                type="button"
                className="flex min-h-14 w-full items-center gap-3 py-2 text-left hover:bg-surface-2"
                onClick={() => {
                  onPick(e.id);
                }}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-semibold">{e.name}</span>
                  <span className="block text-sm text-muted">
                    {e.primaryMuscles.map((m) => MUSCLE_LABELS[m]).join(', ')}
                  </span>
                </span>
                <Plus aria-hidden size={20} className="text-muted" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
