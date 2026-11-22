import { useLiveQuery } from 'dexie-react-hooks';
import { Play, Settings } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { LETTER_STYLES } from '@/components/letterStyles';
import { PageHeader } from '@/components/PageHeader';
import { db } from '@/db/db';
import { findSessionInProgress, startSession } from '@/db/sessionRepo';
import { LETTERS, type Letter } from '@/domain/types';

/**
 * Início provisório (Fase 2): iniciar A/B/C ou continuar a sessão em andamento.
 * O card de próximo treino, o aviso de sobreposição e o resumo entram na Fase 3.
 */
export function HomePage() {
  const navigate = useNavigate();
  const state = useLiveQuery(async () => ({
    current: (await findSessionInProgress()) ?? null,
    templates: await db.templates.orderBy('letter').toArray(),
  }));

  async function start(letter: Letter) {
    const id = await startSession(letter);
    void navigate(`/sessao/${id}`);
  }

  return (
    <>
      <PageHeader
        title="Treino ABC"
        actions={
          <Link
            to="/config"
            aria-label="Configurações"
            className="-mr-2 flex size-11 items-center justify-center rounded-full text-muted hover:text-text"
          >
            <Settings aria-hidden size={22} />
          </Link>
        }
      />

      {state === undefined ? (
        <p className="text-sm text-muted">Carregando…</p>
      ) : state.current ? (
        <Link
          to={`/sessao/${state.current.id}`}
          className={`flex min-h-20 items-center gap-4 rounded-2xl px-5 font-semibold text-bg ${
            LETTER_STYLES[state.current.letter].bg
          }`}
        >
          <Play aria-hidden size={24} fill="currentColor" />
          <span>
            <span className="block text-lg">Continuar sessão</span>
            <span className="block text-sm font-normal">Treino {state.current.letter}</span>
          </span>
        </Link>
      ) : (
        <ul className="flex flex-col gap-2">
          {LETTERS.map((letter) => {
            const t = state.templates.find((x) => x.letter === letter);
            const style = LETTER_STYLES[letter];
            return (
              <li key={letter}>
                <button
                  type="button"
                  onClick={() => void start(letter)}
                  className={`flex min-h-16 w-full items-center gap-4 rounded-xl border-l-4 bg-surface px-4 text-left ${style.border}`}
                >
                  <span className={`text-3xl font-bold ${style.text}`} aria-hidden>
                    {letter}
                  </span>
                  <span className="flex-1">
                    <span className="block font-semibold">Iniciar treino {letter}</span>
                    {t && <span className="block text-sm text-muted">{t.name}</span>}
                  </span>
                  <Play aria-hidden size={20} className="text-muted" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-6 text-center text-xs text-muted">
        Sugestão do próximo treino e resumo: Fase 3.
      </p>
    </>
  );
}
