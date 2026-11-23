import { ChevronRight, HardDriveDownload, Settings, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button } from '@/components/Button';
import { buttonClass } from '@/components/buttonStyles';
import { PageHeader } from '@/components/PageHeader';
import { ArrowLead, LetterTile, Tile } from '@/components/Sign';
import { startSession } from '@/db/sessionRepo';
import { homeSummary, needsBackupReminder } from '@/domain/homeSummary';
import { daysSinceLetter, nextWorkout } from '@/domain/nextWorkout';
import { overlapDetails, templatePrimaryMuscles } from '@/domain/overlap';
import { LETTERS, type Letter, type Session } from '@/domain/types';
import { calendarDaysBetween } from '@/lib/dates';
import { formatDaysAgo, formatShortDate, formatTime, plural } from '@/lib/format';
import { overlapText } from './overlapText';
import { useHomeData, type HomeData } from './useHomeData';

export function HomePage() {
  const data = useHomeData();
  const navigate = useNavigate();

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
            className="-mr-2 flex size-11 items-center justify-center rounded-[3px] text-muted hover:text-text"
          >
            <Settings aria-hidden size={24} strokeWidth={2} />
          </Link>
        }
      />
      {data === undefined ? (
        <p className="text-base text-muted">Carregando…</p>
      ) : (
        <HomeContent data={data} onStart={(l) => void start(l)} />
      )}
    </>
  );
}

function HomeContent({ data, onStart }: { data: HomeData; onStart: (letter: Letter) => void }) {
  const next = nextWorkout(data.sessions);
  const summary = homeSummary(data.sessions, data.now);
  const showBackup = needsBackupReminder(data.settings, data.sessions, data.now);
  const hasHistory = LETTERS.some((l) => summary.lastByLetter[l]);

  return (
    <div className="flex flex-col">
      {next.kind === 'continue' ? (
        <ContinueSign data={data} session={next.session} />
      ) : (
        <>
          <SuggestionSign data={data} letter={next.letter} onStart={onStart} />
          <section aria-labelledby="other-title" className="mt-8">
            <h2 id="other-title" className="mb-2 text-lg font-extrabold">
              Outros treinos
            </h2>
            <ul className="flex flex-col gap-2">
              {LETTERS.filter((l) => l !== next.letter).map((letter) => {
                const t = data.templates.find((x) => x.letter === letter);
                return (
                  <li key={letter}>
                    <button
                      type="button"
                      onClick={() => {
                        onStart(letter);
                      }}
                      className="flex min-h-16 w-full items-center gap-3 rounded-[4px] border-2 border-edge bg-surface px-3 text-left hover:bg-surface-2"
                    >
                      <LetterTile letter={letter} />
                      <span className="min-w-0 flex-1 text-lg leading-tight font-bold">
                        {t?.name ?? `Treino ${letter}`}
                      </span>
                      <ChevronRight aria-hidden size={22} strokeWidth={2.5} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}

      <section aria-labelledby="summary-title" className="mt-8">
        <h2 id="summary-title" className="mb-2 text-lg font-extrabold">
          Resumo
        </h2>
        <div className="rounded-[4px] border-2 border-edge bg-surface px-4 num">
          {hasHistory ? (
            <>
              <dl>
                {LETTERS.map((letter) => {
                  const last = summary.lastByLetter[letter];
                  return (
                    <div
                      key={letter}
                      className="grid min-h-14 grid-cols-[2.25rem_1fr_auto_4.75rem] items-center gap-3 border-b border-border"
                    >
                      <LetterTile letter={letter} size="sm" />
                      <dt className="text-base">Última {letter}</dt>
                      <dd className="text-lg font-bold">{last ? formatShortDate(last) : '—'}</dd>
                      <dd className="text-right text-sm text-muted">
                        {last ? formatDaysAgo(calendarDaysBetween(last, data.now)) : ''}
                      </dd>
                    </div>
                  );
                })}
              </dl>
              <dl className="grid grid-cols-2 border-t-2 border-edge">
                <div className="flex min-h-14 flex-col justify-center border-r border-border py-2 pr-3">
                  <dt className="text-sm text-muted">Últimos 7 dias</dt>
                  <dd className="text-base font-bold">
                    {summary.last7} {plural(summary.last7, 'sessão', 'sessões')}
                  </dd>
                </div>
                <div className="flex min-h-14 flex-col justify-center py-2 pl-3">
                  <dt className="text-sm text-muted">Últimos 30 dias</dt>
                  <dd className="text-base font-bold">
                    {summary.last30} {plural(summary.last30, 'sessão', 'sessões')}
                  </dd>
                </div>
              </dl>
            </>
          ) : (
            <p className="py-4 text-base">
              <span className="block font-bold">Nenhum treino concluído ainda.</span>
              <span className="text-muted">
                Comece pela placa acima: cada treino finalizado entra neste quadro.
              </span>
            </p>
          )}
        </div>
      </section>

      {showBackup && (
        <Link
          to="/config"
          className="mt-6 flex min-h-16 items-center gap-3 border-y border-border py-2 text-base hover:bg-surface-2"
        >
          <Tile icon={HardDriveDownload} />
          <span className="flex-1">
            {data.settings.lastBackupAt
              ? `Último backup ${formatDaysAgo(
                  calendarDaysBetween(data.settings.lastBackupAt, data.now),
                )}. Exporte de novo em Configurações.`
              : 'Você ainda não fez backup. Exporte seus dados em Configurações.'}
          </span>
          <ChevronRight aria-hidden size={22} className="text-muted" />
        </Link>
      )}
    </div>
  );
}

/** A placa amarela: letra monumental, destino e o botão de caminho com a seta presa à borda. */
function SignPanel({
  label,
  letter,
  title,
  detail,
  children,
}: {
  label: string;
  letter: Letter;
  title: string;
  detail: string;
  children: ReactNode;
}) {
  return (
    <section aria-label={label} className="-mx-4 bg-sign px-4 pt-4 pb-4 text-on-sign">
      <div className="flex items-center gap-4">
        <span
          key={letter}
          aria-hidden
          className="-my-3 flap text-[8rem] leading-[0.85] font-black tracking-[-0.04em]"
        >
          {letter}
        </span>
        <div className="min-w-0 flex-1">
          <h2
            className="text-[1.625rem] leading-[1.05] font-extrabold text-balance"
            aria-label={`Treino ${letter}: ${title}`}
          >
            {title}
          </h2>
          <p className="mt-1.5 text-base font-semibold text-pretty text-on-sign-muted num">
            {detail}
          </p>
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function SuggestionSign({
  data,
  letter,
  onStart,
}: {
  data: HomeData;
  letter: Letter;
  onStart: (letter: Letter) => void;
}) {
  const template = data.templates.find((t) => t.letter === letter);
  const days = daysSinceLetter(data.sessions, letter, data.now);
  const overlap = template
    ? overlapDetails({
        muscles: templatePrimaryMuscles(template, data.exercises),
        sessions: data.sessions,
        setLogs: data.recentLogs,
        exercises: data.exercises,
        now: data.now,
      })
    : [];

  return (
    <>
      <SignPanel
        label="Próximo treino"
        letter={letter}
        title={template?.name ?? `Treino ${letter}`}
        detail={
          days === undefined
            ? 'Próximo treino · ainda não feito'
            : `Próximo treino · último ${formatDaysAgo(days)}`
        }
      >
        <Button
          variant="ink"
          arrow
          className="w-full justify-start"
          onClick={() => {
            onStart(letter);
          }}
        >
          Iniciar treino {letter}
        </Button>
      </SignPanel>

      {overlap.length > 0 && (
        <p className="-mx-4 flex min-h-14 items-center gap-3 border-b-2 border-edge bg-surface px-4 py-2 text-base font-semibold">
          <Tile icon={TriangleAlert} size="sm" />
          <span>{overlapText(overlap, data.now)}</span>
        </p>
      )}
    </>
  );
}

function ContinueSign({ data, session }: { data: HomeData; session: Session }) {
  const template = data.templates.find((t) => t.id === session.templateId);
  const n = data.currentSetCount;

  return (
    <SignPanel
      label="Sessão em andamento"
      letter={session.letter}
      title={template?.name ?? `Treino ${session.letter}`}
      detail={`Em andamento desde ${formatTime(session.startedAt)} · ${n} ${plural(n, 'série', 'séries')}`}
    >
      <Link to={`/sessao/${session.id}`} className={buttonClass('ink', 'w-full justify-start')}>
        <ArrowLead />
        <span>Continuar sessão</span>
      </Link>
    </SignPanel>
  );
}
