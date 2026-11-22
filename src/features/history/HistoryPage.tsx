import { useLiveQuery } from 'dexie-react-hooks';
import { MessageSquareText } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';
import { LetterFilter } from '@/components/LetterFilter';
import { LETTER_STYLES } from '@/components/letterStyles';
import { PageHeader } from '@/components/PageHeader';
import { db } from '@/db/db';
import { groupByMonth, historyItems } from '@/domain/history';
import { LETTERS, type Letter } from '@/domain/types';
import { formatDuration, formatMonthKey, formatWeekdayDate, plural } from '@/lib/format';

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
      <div className="mb-4">
        <LetterFilter
          label="Filtrar por treino"
          value={letter}
          onChange={(l) => {
            setParams(l ? { letra: l } : {}, { replace: true });
          }}
        />
      </div>

      {data === undefined ? (
        <p className="text-sm text-muted">Carregando…</p>
      ) : items.length === 0 ? (
        <div className="rounded-xl bg-surface p-6 text-center text-sm text-muted">
          {data.sessions.length === 0 ? (
            <>
              <p>Nenhum treino concluído ainda.</p>
              <p className="mt-1">Os treinos finalizados aparecem aqui.</p>
              <Link
                to="/"
                className="mt-3 inline-flex min-h-11 items-center font-semibold text-text"
              >
                Ir para o Início
              </Link>
            </>
          ) : (
            <p>Nenhum treino {letter} concluído ainda.</p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {groups.map((group) => (
            <section key={group.key} aria-labelledby={`mes-${group.key}`}>
              <h2 id={`mes-${group.key}`} className="mb-2 text-sm font-semibold text-muted">
                {formatMonthKey(group.key)}
              </h2>
              <ul className="flex flex-col gap-2">
                {group.items.map(({ session, exercisesDone, totalSets, durationMin }) => {
                  const style = LETTER_STYLES[session.letter];
                  const name = templateName(session.templateId) ?? `Treino ${session.letter}`;
                  const stats = [
                    `${exercisesDone} ${plural(exercisesDone, 'exercício', 'exercícios')}`,
                    `${totalSets} ${plural(totalSets, 'série', 'séries')}`,
                    ...(durationMin !== undefined ? [formatDuration(durationMin)] : []),
                  ].join(' · ');
                  return (
                    <li key={session.id}>
                      <Link
                        to={`/historico/${session.id}`}
                        className={`flex min-h-16 items-center gap-3 rounded-xl border-l-4 bg-surface px-3 py-2 ${style.border}`}
                      >
                        <span className={`w-6 text-center text-2xl font-bold ${style.text}`}>
                          {session.letter}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">
                            {`${formatWeekdayDate(session.startedAt)} · `}
                            <span className="font-normal text-muted">{name}</span>
                          </span>
                          <span className="block text-sm text-muted num">{stats}</span>
                        </span>
                        {session.notes && (
                          <MessageSquareText
                            aria-label="Tem observação"
                            size={18}
                            className="shrink-0 text-muted"
                          />
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
