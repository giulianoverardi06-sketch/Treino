import { useLiveQuery } from 'dexie-react-hooks';
import { History, MessageSquareText } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';
import { LetterFilter } from '@/components/LetterFilter';
import { PageHeader } from '@/components/PageHeader';
import { LetterTile, Tile } from '@/components/Sign';
import { db } from '@/db/db';
import { groupByMonth, historyItems } from '@/domain/history';
import { LETTERS, type Letter } from '@/domain/types';
import { formatDuration, formatMonthKey, formatWeekdayDate, plural } from '@/lib/format';

/** Colunas do quadro: data | letra | treino | séries | tempo. */
const BOARD_COLS =
  'grid grid-cols-[3.75rem_2.25rem_minmax(0,1fr)_2.25rem_3.25rem] items-center gap-2';

const boardDate = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: 'numeric' });

/** "sáb. 21" */
function formatBoardDate(iso: string): string {
  return boardDate.format(new Date(iso)).replace(',', '');
}

function parseLetter(value: string | null): Letter | undefined {
  return LETTERS.find((l) => l === value);
}

export function HistoryPage() {
  const [params, setParams] = useSearchParams();
  const letter = parseLetter(params.get('letra'));
  const data = useLiveQuery(async () => {
    const [sessions, setLogs, templates] = await Promise.all([
      db.sessions.where('status').equals('concluida').toArray(),
      db.setLogs.toArray(),
      db.templates.toArray(),
    ]);
    return { sessions, setLogs, templates };
  });

  const items = data ? historyItems(data.sessions, data.setLogs, letter ? { letter } : {}) : [];
  const groups = groupByMonth(items, (i) => i.session.startedAt);
  const templateName = (id: string) => data?.templates.find((t) => t.id === id)?.name;

  return (
    <>
      <PageHeader title="Histórico" />
      <div className="mb-5">
        <LetterFilter
          label="Filtrar por treino"
          value={letter}
          onChange={(l) => {
            setParams(l ? { letra: l } : {}, { replace: true });
          }}
        />
      </div>

      {data === undefined ? (
        <p className="text-base text-muted">Carregando…</p>
      ) : items.length === 0 ? (
        <div className="flex items-start gap-3 border-y border-border py-4 text-base">
          <Tile icon={History} />
          {data.sessions.length === 0 ? (
            <div className="pt-1">
              <p className="font-semibold">Nenhum treino concluído ainda.</p>
              <p className="text-muted">Os treinos finalizados aparecem aqui.</p>
              <Link
                to="/"
                className="mt-1 inline-flex min-h-11 items-center font-semibold underline underline-offset-4"
              >
                Ir para o Início
              </Link>
            </div>
          ) : (
            <p className="pt-2.5 font-semibold">Nenhum treino {letter} concluído ainda.</p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((group) => (
            <section key={group.key} aria-labelledby={`mes-${group.key}`}>
              <h2
                id={`mes-${group.key}`}
                className="mb-2 border-b-2 border-edge pb-1 text-lg font-extrabold first-letter:uppercase"
              >
                {formatMonthKey(group.key)}
              </h2>
              <div className="rounded-[4px] border-2 border-edge bg-surface num">
                <div
                  aria-hidden
                  className={`${BOARD_COLS} border-b border-border px-3 py-1.5 text-xs font-semibold text-muted`}
                >
                  <span>Data</span>
                  <span />
                  <span>Treino</span>
                  <span className="text-right">Séries</span>
                  <span className="text-right">Tempo</span>
                </div>
                <ul>
                  {group.items.map(({ session, totalSets, durationMin }) => {
                    const name = templateName(session.templateId) ?? `Treino ${session.letter}`;
                    return (
                      <li key={session.id} className="border-b border-border last:border-b-0">
                        <Link
                          to={`/historico/${session.id}`}
                          aria-label={`${formatWeekdayDate(session.startedAt)}, treino ${session.letter}: ${name}, ${totalSets} ${plural(totalSets, 'série', 'séries')}${durationMin !== undefined ? `, ${formatDuration(durationMin)}` : ''}`}
                          className={`${BOARD_COLS} min-h-14 px-3 py-1.5 hover:bg-surface-2`}
                        >
                          <span className="text-base font-bold first-letter:uppercase">
                            {formatBoardDate(session.startedAt)}
                          </span>
                          <LetterTile letter={session.letter} size="sm" />
                          <span className="flex min-w-0 items-center gap-1.5 text-base">
                            <span className="line-clamp-2 text-[0.9375rem] leading-tight">
                              {name}
                            </span>
                            {session.notes && (
                              <MessageSquareText
                                aria-label="Tem observação"
                                size={16}
                                className="shrink-0 text-muted"
                              />
                            )}
                          </span>
                          <span className="text-right text-lg font-bold">{totalSets}</span>
                          <span className="text-right text-base">
                            {durationMin !== undefined ? formatDuration(durationMin) : '—'}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
