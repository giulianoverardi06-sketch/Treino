import { useLiveQuery } from 'dexie-react-hooks';
import { HeartPulse, History, MessageSquareText } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';
import { LetterFilter } from '@/components/LetterFilter';
import { PageHeader } from '@/components/PageHeader';
import { LetterTile, Tile } from '@/components/Sign';
import { db } from '@/db/db';
import { cardioLabel, INTENSITY_LABELS } from '@/domain/cardio';
import { groupByMonth, historyItems, mergeTimeline, type HistoryItem } from '@/domain/history';
import { rotationOf } from '@/domain/program';
import { LETTERS, type CardioSession, type Letter } from '@/domain/types';
import {
  formatDuration,
  formatMonthKey,
  formatNumber,
  formatWeekdayDate,
  plural,
} from '@/lib/format';

/** Colunas do quadro: data | letra | treino | séries | tempo. */
const BOARD_COLS =
  'grid grid-cols-[3.75rem_2.25rem_minmax(0,1fr)_2.25rem_3.25rem] items-center gap-2';

const boardDate = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: 'numeric' });

/** "sáb. 21" */
function formatBoardDate(iso: string): string {
  return boardDate.format(new Date(iso)).replace(',', '');
}

type Filter = Letter | 'cardio' | undefined;

/** `?letra=B` filtra um treino; `?tipo=cardio` mostra só o cardio. */
function parseFilter(params: URLSearchParams): Filter {
  if (params.get('tipo') === 'cardio') return 'cardio';
  return LETTERS.find((l) => l === params.get('letra'));
}

export function HistoryPage() {
  const [params, setParams] = useSearchParams();
  const filter = parseFilter(params);
  const letter = filter === 'cardio' ? undefined : filter;
  const data = useLiveQuery(async () => {
    const [sessions, setLogs, templates, cardio] = await Promise.all([
      db.sessions.where('status').equals('concluida').toArray(),
      db.setLogs.toArray(),
      db.templates.toArray(),
      db.cardio.toArray(),
    ]);
    return { sessions, setLogs, templates, cardio };
  });

  const items =
    data && filter !== 'cardio'
      ? historyItems(data.sessions, data.setLogs, letter ? { letter } : {})
      : [];
  const cardio = data && (filter === undefined || filter === 'cardio') ? data.cardio : [];
  const timeline = mergeTimeline(items, cardio);
  const groups = groupByMonth(timeline, (t) => t.at);
  const templateName = (id: string) => data?.templates.find((t) => t.id === id)?.name;
  // Letras do programa e as de treinos removidos que ainda têm sessões no histórico.
  const letters = data ? rotationOf([...data.templates, ...data.sessions]) : [];
  const hasCardio = (data?.cardio.length ?? 0) > 0;
  const nothingAtAll = data !== undefined && data.sessions.length === 0 && !hasCardio;

  return (
    <>
      <PageHeader title="Histórico" />
      <div className="mb-5">
        <LetterFilter
          label="Filtrar por treino"
          letters={letters}
          extras={hasCardio || filter === 'cardio' ? [{ value: 'cardio', label: 'Cardio' }] : []}
          value={filter}
          onChange={(f) => {
            setParams(f === 'cardio' ? { tipo: 'cardio' } : f ? { letra: f } : {}, {
              replace: true,
            });
          }}
        />
      </div>

      {data === undefined ? (
        <p className="text-base text-muted">Carregando…</p>
      ) : timeline.length === 0 ? (
        <div className="flex items-start gap-3 border-y border-border py-4 text-base">
          <Tile icon={History} />
          {nothingAtAll ? (
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
            <p className="pt-2.5 font-semibold">
              {filter === 'cardio'
                ? 'Nenhum cardio registrado ainda.'
                : `Nenhum treino ${letter ?? ''} concluído ainda.`}
            </p>
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
                  {group.items.map((t) =>
                    t.kind === 'treino' ? (
                      <WorkoutRow
                        key={t.item.session.id}
                        item={t.item}
                        name={templateName(t.item.session.templateId)}
                      />
                    ) : (
                      <CardioRow key={t.cardio.id} cardio={t.cardio} />
                    ),
                  )}
                </ul>
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}

function WorkoutRow({ item, name: given }: { item: HistoryItem; name: string | undefined }) {
  const { session, totalSets, durationMin } = item;
  const name = given ?? `Treino ${session.letter}`;
  return (
    <li className="border-b border-border last:border-b-0">
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
          <span className="line-clamp-2 text-[0.9375rem] leading-tight">{name}</span>
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
}

/** Cardio no mesmo quadro: pictograma no lugar da letra, distância e intensidade abaixo do nome. */
function CardioRow({ cardio }: { cardio: CardioSession }) {
  const name = cardioLabel(cardio);
  const detail = [
    cardio.distanceKm !== undefined ? `${formatNumber(cardio.distanceKm)} km` : undefined,
    cardio.intensity ? INTENSITY_LABELS[cardio.intensity] : undefined,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <li className="border-b border-border last:border-b-0">
      <Link
        to={`/cardio/${cardio.id}`}
        aria-label={`${formatWeekdayDate(cardio.startedAt)}, cardio: ${name}${detail ? `, ${detail}` : ''}, ${formatDuration(cardio.durationMin)}`}
        className={`${BOARD_COLS} min-h-14 px-3 py-1.5 hover:bg-surface-2`}
      >
        <span className="text-base font-bold first-letter:uppercase">
          {formatBoardDate(cardio.startedAt)}
        </span>
        <Tile icon={HeartPulse} size="sm" />
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="min-w-0">
            <span className="block truncate text-[0.9375rem] leading-tight">{name}</span>
            {detail && <span className="block truncate text-sm text-muted">{detail}</span>}
          </span>
          {cardio.notes && (
            <MessageSquareText
              aria-label="Tem observação"
              size={16}
              className="shrink-0 text-muted"
            />
          )}
        </span>
        <span className="text-right text-lg font-bold text-muted">—</span>
        <span className="text-right text-base">{formatDuration(cardio.durationMin)}</span>
      </Link>
    </li>
  );
}
