import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronRight, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { buttonClass } from '@/components/buttonStyles';
import { PageHeader } from '@/components/PageHeader';
import { Select } from '@/components/Select';
import { ProgramTabs } from '@/components/ProgramTabs';
import { db } from '@/db/db';
import { EQUIPMENT_LABELS, MUSCLE_LABELS } from '@/domain/labels';
import { filterLibrary } from '@/domain/program';
import type { Equipment, MuscleGroup } from '@/domain/types';
import { plural } from '@/lib/format';

export function LibraryPage() {
  const exercises = useLiveQuery(() => db.exercises.toArray());
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<MuscleGroup | ''>('');
  const [equipment, setEquipment] = useState<Equipment | ''>('');
  const [showArchived, setShowArchived] = useState(false);

  const list = exercises
    ? filterLibrary(
        exercises,
        {
          query,
          muscle: muscle || undefined,
          equipment: equipment || undefined,
          showArchived,
        },
        MUSCLE_LABELS,
      )
    : [];

  return (
    <>
      <PageHeader title="Programa" />
      <ProgramTabs />

      <div className="flex flex-col gap-3">
        <label className="relative block">
          <span className="sr-only">Buscar na biblioteca</span>
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
            }}
            placeholder="Buscar exercício"
            className="h-12 w-full rounded-[3px] border-2 border-edge bg-surface pr-12 pl-3 text-base text-text"
          />
          <Search
            aria-hidden
            size={20}
            className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-muted"
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="sr-only">Grupo muscular</span>
            <Select
              value={muscle}
              onChange={(e) => {
                setMuscle(e.target.value as MuscleGroup | '');
              }}
            >
              <option value="">Todos os grupos</option>
              {Object.entries(MUSCLE_LABELS).map(([value, text]) => (
                <option key={value} value={value}>
                  {text}
                </option>
              ))}
            </Select>
          </label>
          <label className="block">
            <span className="sr-only">Equipamento</span>
            <Select
              value={equipment}
              onChange={(e) => {
                setEquipment(e.target.value as Equipment | '');
              }}
            >
              <option value="">Todo equipamento</option>
              {Object.entries(EQUIPMENT_LABELS).map(([value, text]) => (
                <option key={value} value={value}>
                  {text}
                </option>
              ))}
            </Select>
          </label>
        </div>
        <div className="flex items-center justify-between gap-3">
          <label className="flex min-h-11 items-center gap-2 text-base">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => {
                setShowArchived(e.target.checked);
              }}
              className="size-5 accent-current"
            />
            Mostrar arquivados
          </label>
          <Link to="/biblioteca/novo" className={buttonClass('outline', 'min-h-11')}>
            <Plus aria-hidden size={20} strokeWidth={2.5} />
            <span>Novo</span>
          </Link>
        </div>
      </div>

      {exercises === undefined ? (
        <p className="mt-4 text-base text-muted">Carregando…</p>
      ) : (
        <section aria-labelledby="library-count" className="mt-4">
          <h2 id="library-count" className="mb-2 text-sm font-semibold text-muted num">
            {list.length} {plural(list.length, 'exercício', 'exercícios')}
          </h2>
          {list.length === 0 ? (
            <p className="rounded-[4px] border-2 border-edge bg-surface px-3 py-4 text-base">
              Nenhum exercício com esses filtros.
            </p>
          ) : (
            <ul className="rounded-[4px] border-2 border-edge bg-surface px-3">
              {list.map((e) => (
                <li key={e.id} className="border-b border-border last:border-b-0">
                  <Link
                    to={`/biblioteca/${e.id}`}
                    className="flex min-h-16 items-center gap-3 py-2 hover:bg-surface-2"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-base leading-tight font-bold">
                        {e.name}
                        {e.archived && (
                          <span className="ml-2 rounded-[2px] border border-edge px-1.5 text-xs font-semibold text-muted">
                            arquivado
                          </span>
                        )}
                      </span>
                      <span className="block truncate text-sm text-muted">
                        {e.primaryMuscles.map((m) => MUSCLE_LABELS[m]).join(', ')} ·{' '}
                        {EQUIPMENT_LABELS[e.equipment]}
                      </span>
                    </span>
                    <ChevronRight aria-hidden size={22} className="text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </>
  );
}
