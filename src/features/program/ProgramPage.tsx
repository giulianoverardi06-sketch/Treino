import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router';
import { PageHeader } from '@/components/PageHeader';
import { ProgramTabs } from '@/components/ProgramTabs';
import { LetterTile } from '@/components/Sign';
import { db } from '@/db/db';

export function ProgramPage() {
  const templates = useLiveQuery(() => db.templates.orderBy('letter').toArray());

  return (
    <>
      <PageHeader title="Programa" />
      <ProgramTabs />
      {templates === undefined ? (
        <p className="text-base text-muted">Carregando…</p>
      ) : (
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
      )}
    </>
  );
}
