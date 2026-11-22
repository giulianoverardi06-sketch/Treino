import { Search } from 'lucide-react';
import { useState } from 'react';
import { Modal } from '@/components/Modal';
import { MUSCLE_LABELS } from '@/domain/labels';
import type { Exercise } from '@/domain/types';

interface AddExerciseSheetProps {
  exercises: ReadonlyMap<string, Exercise>;
  onPick: (exerciseId: string) => void;
  onClose: () => void;
}

const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

export function AddExerciseSheet({ exercises, onPick, onClose }: AddExerciseSheetProps) {
  const [query, setQuery] = useState('');
  const q = normalize(query.trim());
  const list = [...exercises.values()]
    .filter((e) => !e.archived)
    .filter(
      (e) =>
        !q ||
        normalize(e.name).includes(q) ||
        e.primaryMuscles.some((m) => normalize(MUSCLE_LABELS[m]).includes(q)),
    )
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  return (
    <Modal title="Adicionar exercício" onClose={onClose}>
      <label className="relative mb-3 block">
        <span className="sr-only">Buscar exercício</span>
        <Search
          aria-hidden
          size={18}
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
          }}
          placeholder="Nome ou grupo muscular"
          className="h-11 w-full rounded-lg bg-bg pr-3 pl-10 text-text placeholder:text-muted"
        />
      </label>
      {list.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">Nenhum exercício encontrado.</p>
      ) : (
        <ul className="flex flex-col">
          {list.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                className="flex min-h-12 w-full flex-col justify-center rounded-lg px-2 py-1 text-left hover:bg-surface-2"
                onClick={() => {
                  onPick(e.id);
                }}
              >
                <span>{e.name}</span>
                <span className="text-xs text-muted">
                  {e.primaryMuscles.map((m) => MUSCLE_LABELS[m]).join(', ')}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
