import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router';
import { LETTER_STYLES } from '@/components/letterStyles';
import { PageHeader } from '@/components/PageHeader';
import { ProgramTabs } from '@/components/ProgramTabs';
import { db } from '@/db/db';

export function ProgramPage() {
  const templates = useLiveQuery(() => db.templates.orderBy('letter').toArray());

  return (
    <>
      <PageHeader title="Programa" />
      <ProgramTabs />
      {templates === undefined ? (
        <p className="text-sm text-muted">Carregando…</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {templates.map((t) => {
            const style = LETTER_STYLES[t.letter];
            const optional = t.slots.filter((s) => s.optional).length;
            return (
              <li key={t.id}>
                <Link
                  to={`/programa/${t.letter}`}
                  className={`flex min-h-14 items-center gap-4 rounded-xl border-l-4 bg-surface px-4 py-3 ${style.border}`}
                >
                  <span className={`text-3xl font-bold ${style.text}`} aria-hidden>
                    {t.letter}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">
                      <span className="sr-only">Treino {t.letter}: </span>
                      {t.name}
                    </span>
                    <span className="block truncate text-sm text-muted">{t.emphasis}</span>
                    <span className="block text-xs text-muted num">
                      {`${t.slots.length} exercícios` +
                        (optional > 0
                          ? ` · ${optional} ${optional > 1 ? 'opcionais' : 'opcional'}`
                          : '')}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
