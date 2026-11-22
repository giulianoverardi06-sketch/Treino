import { HardDriveDownload, Info, Play, Settings } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { LETTER_STYLES } from '@/components/letterStyles';
import { PageHeader } from '@/components/PageHeader';
import { startSession } from '@/db/sessionRepo';
import { homeSummary, needsBackupReminder } from '@/domain/homeSummary';
import { daysSinceLetter, nextWorkout } from '@/domain/nextWorkout';
import { overlapDetails, templatePrimaryMuscles } from '@/domain/overlap';
import { LETTERS, type Letter, type Session } from '@/domain/types';
import { calendarDaysBetween } from '@/lib/dates';
import { formatDaysAgo, formatShortDate, plural } from '@/lib/format';
import { overlapText } from './overlapText';
import { useHomeData, type HomeData } from './useHomeData';

const timeFormatter = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });

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
            className="-mr-2 flex size-11 items-center justify-center rounded-full text-muted hover:text-text"
          >
            <Settings aria-hidden size={22} />
          </Link>
        }
      />
      {data === undefined ? (
        <p className="text-sm text-muted">Carregando…</p>
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

  return (
    <div className="flex flex-col gap-4">
      {next.kind === 'continue' ? (
        <ContinueCard data={data} session={next.session} />
      ) : (
        <>
          <SuggestionCard data={data} letter={next.letter} onStart={onStart} />
          <section aria-labelledby="other-title">
            <h2 id="other-title" className="mb-2 text-sm text-muted">
              Outro treino
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {LETTERS.filter((l) => l !== next.letter).map((letter) => {
                const t = data.templates.find((x) => x.letter === letter);
                return (
                  <button
                    key={letter}
                    type="button"
                    aria-label={`Iniciar treino ${letter}: ${t?.name ?? ''}`}
                    onClick={() => {
                      onStart(letter);
                    }}
                    className={`flex min-h-14 items-center gap-3 rounded-xl border-l-4 bg-surface px-3 text-left ${LETTER_STYLES[letter].border}`}
                  >
                    <span
                      className={`text-2xl font-bold ${LETTER_STYLES[letter].text}`}
                      aria-hidden
                    >
                      {letter}
                    </span>
                    <span className="min-w-0 text-sm">
                      <span className="line-clamp-2">{t?.name ?? `Treino ${letter}`}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </>
      )}

      <section aria-labelledby="summary-title" className="rounded-xl bg-surface p-4">
        <h2 id="summary-title" className="sr-only">
          Resumo
        </h2>
        <dl className="grid grid-cols-2 gap-3">
          <div>
            <dt className="text-xs text-muted">Últimos 7 dias</dt>
            <dd className="text-xl font-semibold num">
              {summary.last7}{' '}
              <span className="text-sm font-normal text-muted">
                {plural(summary.last7, 'sessão', 'sessões')}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Últimos 30 dias</dt>
            <dd className="text-xl font-semibold num">
              {summary.last30}{' '}
              <span className="text-sm font-normal text-muted">
                {plural(summary.last30, 'sessão', 'sessões')}
              </span>
            </dd>
          </div>
        </dl>
        <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3">
          {LETTERS.map((letter) => {
            const last = summary.lastByLetter[letter];
            return (
              <div key={letter}>
                <dt className={`text-xs font-semibold ${LETTER_STYLES[letter].text}`}>
                  Última {letter}
                </dt>
                <dd className="text-sm num">{last ? formatShortDate(last) : '—'}</dd>
              </div>
            );
          })}
        </dl>
      </section>

      {showBackup && (
        <Link
          to="/config"
          className="flex min-h-14 items-center gap-3 rounded-xl border border-border px-4 text-sm"
        >
          <HardDriveDownload aria-hidden size={20} className="shrink-0 text-muted" />
          <span>
            {data.settings.lastBackupAt
              ? `Último backup ${formatDaysAgo(
                  calendarDaysBetween(data.settings.lastBackupAt, data.now),
                )}. Que tal exportar de novo?`
              : 'Você ainda não fez backup. Exporte seus dados em Configurações.'}
          </span>
        </Link>
      )}
    </div>
  );
}

function SuggestionCard({
  data,
  letter,
  onStart,
}: {
  data: HomeData;
  letter: Letter;
  onStart: (letter: Letter) => void;
}) {
  const style = LETTER_STYLES[letter];
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
    <section
      aria-labelledby="next-title"
      className={`rounded-2xl border-l-4 bg-surface p-5 ${style.border}`}
    >
      <p id="next-title" className="text-sm text-muted">
        Próximo treino
      </p>
      <div className="mt-1 flex items-center gap-4">
        <span className={`text-7xl leading-none font-bold ${style.text}`} aria-hidden>
          {letter}
        </span>
        <div className="min-w-0">
          <h2
            className="text-lg leading-tight font-semibold"
            aria-label={`Treino ${letter}: ${template?.name ?? ''}`}
          >
            {template?.name ?? `Treino ${letter}`}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {days === undefined ? 'Ainda não feito' : `Última vez ${formatDaysAgo(days)}`}
          </p>
        </div>
      </div>

      {overlap.length > 0 && (
        <p className="mt-4 flex items-start gap-2 rounded-lg bg-surface-2 px-3 py-2 text-sm text-muted">
          <Info aria-hidden size={16} className="mt-0.5 shrink-0" />
          <span>{overlapText(overlap, data.now)}</span>
        </p>
      )}

      <button
        type="button"
        onClick={() => {
          onStart(letter);
        }}
        className={`mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl text-lg font-semibold text-bg ${style.bg}`}
      >
        <Play aria-hidden size={20} fill="currentColor" />
        Iniciar treino {letter}
      </button>
    </section>
  );
}

function ContinueCard({ data, session }: { data: HomeData; session: Session }) {
  const style = LETTER_STYLES[session.letter];
  const template = data.templates.find((t) => t.id === session.templateId);
  const n = data.currentSetCount;

  return (
    <section
      aria-labelledby="continue-title"
      className={`rounded-2xl border-l-4 bg-surface p-5 ${style.border}`}
    >
      <p id="continue-title" className="text-sm text-muted">
        Sessão em andamento
      </p>
      <div className="mt-1 flex items-center gap-4">
        <span className={`text-7xl leading-none font-bold ${style.text}`} aria-hidden>
          {session.letter}
        </span>
        <div className="min-w-0">
          <h2
            className="text-lg leading-tight font-semibold"
            aria-label={`Treino ${session.letter}: ${template?.name ?? ''}`}
          >
            {template?.name ?? `Treino ${session.letter}`}
          </h2>
          <p className="mt-1 text-sm text-muted num">
            Iniciada às {timeFormatter.format(new Date(session.startedAt))} ·{' '}
            {`${n} ${plural(n, 'série', 'séries')}`}
          </p>
        </div>
      </div>
      <Link
        to={`/sessao/${session.id}`}
        className={`mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl text-lg font-semibold text-bg ${style.bg}`}
      >
        <Play aria-hidden size={20} fill="currentColor" />
        Continuar sessão
      </Link>
    </section>
  );
}
