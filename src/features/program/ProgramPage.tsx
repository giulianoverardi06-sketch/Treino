import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronRight, Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { PageHeader } from '@/components/PageHeader';
import { ProgramTabs } from '@/components/ProgramTabs';
import { LetterTile } from '@/components/Sign';
import { db } from '@/db/db';
import { addTemplate } from '@/db/programRepo';
import { nextTemplateLetter } from '@/domain/program';
import { MAX_WORKOUTS } from '@/domain/types';

export function ProgramPage() {
  const templates = useLiveQuery(() => db.templates.orderBy('letter').toArray());
  const navigate = useNavigate();
  const nextLetter = templates ? nextTemplateLetter(templates) : undefined;

  async function add() {
    const letter = await addTemplate();
    void navigate(`/programa/${letter}`);
  }

  return (
    <>
      <PageHeader title="Programa" />
      <ProgramTabs />
      {templates === undefined ? (
        <p className="text-base text-muted">Carregando…</p>
      ) : (
        <>
          <ul className="border-t border-border">
            {templates.map((t) => {
              const optional = t.slots.filter((s) => s.optional).length;
              return (
                <li key={t.id} className="border-b border-border">
                  <Link
                    to={`/programa/${t.letter}`}
                    aria-label={`Treino ${t.letter}: ${t.name}`}
                    className="flex min-h-20 items-center gap-4 py-3 hover:bg-surface-2"
                  >
                    <LetterTile letter={t.letter} size="lg" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-lg leading-tight font-bold">{t.name}</span>
                      <span className="block truncate text-sm text-muted">{t.emphasis}</span>
                      <span className="block text-sm font-semibold num">
                        {`${t.slots.length} exercícios` +
                          (optional > 0
                            ? ` · ${optional} ${optional > 1 ? 'opcionais' : 'opcional'}`
                            : '')}
                      </span>
                    </span>
                    <ChevronRight aria-hidden size={22} className="text-muted" />
                  </Link>
                </li>
              );
            })}
          </ul>
          {nextLetter ? (
            <button
              type="button"
              className="mt-4 flex min-h-14 w-full items-center gap-3 rounded-[3px] border-2 border-dashed border-edge px-3 text-base font-semibold text-muted hover:text-text"
              onClick={() => void add()}
            >
              <Plus aria-hidden size={22} strokeWidth={2.5} /> Treino {nextLetter}
            </button>
          ) : (
            <p className="mt-4 text-sm text-muted">
              O programa já tem o máximo de {MAX_WORKOUTS} treinos.
            </p>
          )}
          <p className="mt-2 text-sm text-muted">
            A rotação segue a ordem das letras e volta ao A depois do último treino.
          </p>
        </>
      )}
    </>
  );
}
