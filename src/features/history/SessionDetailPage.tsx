import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronRight, Flame, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { LETTER_STYLES } from '@/components/letterStyles';
import { Modal } from '@/components/Modal';
import { PageHeader } from '@/components/PageHeader';
import { RepsInput, WeightInput } from '@/components/SetInputs';
import { db } from '@/db/db';
import { deleteSession, updateSessionNotes, updateSet } from '@/db/sessionRepo';
import { orderedEntries } from '@/domain/sessionFactory';
import type { Exercise, Session, SetLog, WorkoutTemplate } from '@/domain/types';
import { formatDuration, formatLongDate, formatTime, plural } from '@/lib/format';

interface DetailData {
  session: Session;
  template: WorkoutTemplate | undefined;
  exercises: ReadonlyMap<string, Exercise>;
  logs: SetLog[];
}

export function SessionDetailPage() {
  const { id = '' } = useParams();
  const data = useLiveQuery(async (): Promise<DetailData | null> => {
    const session = await db.sessions.get(id);
    if (!session) return null;
    const [template, exercises, logs] = await Promise.all([
      db.templates.get(session.templateId),
      db.exercises.toArray(),
      db.setLogs.where('sessionId').equals(id).toArray(),
    ]);
    return { session, template, exercises: new Map(exercises.map((e) => [e.id, e])), logs };
  }, [id]);

  if (data === undefined) return <p className="text-sm text-muted">Carregando…</p>;
  if (data === null) {
    return (
      <>
        <PageHeader title="Sessão" backTo="/historico" />
        <p className="text-sm text-muted">Sessão não encontrada.</p>
      </>
    );
  }
  if (data.session.status === 'em_andamento') {
    return <Navigate to={`/sessao/${data.session.id}`} replace />;
  }
  return <SessionDetail data={data} />;
}

const SET_COLS = 'grid grid-cols-[1.5rem_minmax(0,1fr)_3.5rem_2.75rem] items-center gap-2';

function SessionDetail({ data }: { data: DetailData }) {
  const { session, template, exercises, logs } = data;
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const style = LETTER_STYLES[session.letter];

  const logsByEntry = new Map<string, SetLog[]>();
  for (const l of [...logs].sort((a, b) => a.setIndex - b.setIndex)) {
    logsByEntry.set(l.entryId, [...(logsByEntry.get(l.entryId) ?? []), l]);
  }
  const duration = session.finishedAt
    ? Math.round((Date.parse(session.finishedAt) - Date.parse(session.startedAt)) / 60_000)
    : undefined;

  async function remove() {
    void navigate('/historico', { replace: true });
    await deleteSession(session.id);
  }

  return (
    <>
      <PageHeader title={`Treino ${session.letter}`} backTo="/historico" />
      <div className="-mt-3 mb-4 text-sm text-muted">
        {template && <p className="text-text">{template.name}</p>}
        <p className="first-letter:uppercase">{formatLongDate(session.startedAt)}</p>
        <p className="num">
          {formatTime(session.startedAt)}
          {session.finishedAt && `–${formatTime(session.finishedAt)}`}
          {duration !== undefined && ` (${formatDuration(duration)})`}
          {' · '}
          {logs.length} {plural(logs.length, 'série', 'séries')}
        </p>
        {session.status === 'descartada' && (
          <p className="mt-1 inline-block rounded bg-surface-2 px-2 py-0.5 text-xs">
            Sessão descartada — não conta no histórico
          </p>
        )}
      </div>

      <ol className="flex flex-col gap-2" aria-label="Exercícios">
        {orderedEntries(session).map((entry) => {
          const entryLogs = logsByEntry.get(entry.id) ?? [];
          const exercise = exercises.get(entry.exerciseId);
          const status = entry.skipped ? 'pulado' : entryLogs.length === 0 ? 'não feito' : null;
          return (
            <li key={entry.id} className="rounded-xl bg-surface p-3">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/exercicio/${entry.exerciseId}`}
                    className="inline-flex min-h-11 items-center gap-1 font-semibold"
                  >
                    {exercise?.name ?? 'Exercício removido'}
                    <ChevronRight aria-hidden size={16} className="text-muted" />
                  </Link>
                  {entry.slotId && <p className="-mt-2 text-xs text-muted">{entry.label}</p>}
                </div>
                {status && (
                  <span className="mt-3 rounded bg-surface-2 px-1.5 py-0.5 text-xs text-muted">
                    {status}
                  </span>
                )}
              </div>

              {entryLogs.length > 0 && (
                <>
                  <div className={`${SET_COLS} mt-2 text-[0.7rem] text-muted`} aria-hidden>
                    <span className="text-center">#</span>
                    <span className="text-center">Carga (kg)</span>
                    <span className="text-center">Reps</span>
                    <span className="text-center">Falha</span>
                  </div>
                  <ol
                    className="mt-1 flex flex-col gap-1"
                    aria-label={`Séries de ${exercise?.name ?? 'exercício'}`}
                  >
                    {entryLogs.map((log, i) => {
                      const n = i + 1;
                      return (
                        <li key={log.id} className={SET_COLS}>
                          <span className={`text-center text-sm font-semibold num ${style.text}`}>
                            {n}
                          </span>
                          <WeightInput
                            key={log.weightKg}
                            value={log.weightKg}
                            label={`Carga da série ${n} de ${exercise?.name ?? 'exercício'} (kg)`}
                            onCommit={(kg) => void updateSet(log.id, { weightKg: kg })}
                          />
                          <RepsInput
                            key={log.reps ?? 'vazio'}
                            value={log.reps}
                            placeholder="–"
                            label={`Repetições da série ${n} de ${exercise?.name ?? 'exercício'}`}
                            onCommit={(reps) => void updateSet(log.id, { reps: reps ?? null })}
                          />
                          <button
                            type="button"
                            aria-label={`Série ${n} até a falha`}
                            aria-pressed={log.toFailure}
                            onClick={() => void updateSet(log.id, { toFailure: !log.toFailure })}
                            className={`flex size-11 items-center justify-center rounded-lg ${
                              log.toFailure ? style.text : 'text-muted/50'
                            }`}
                          >
                            <Flame
                              aria-hidden
                              size={20}
                              fill={log.toFailure ? 'currentColor' : 'none'}
                            />
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                </>
              )}
            </li>
          );
        })}
      </ol>

      <NotesField session={session} />

      <button
        type="button"
        onClick={() => {
          setConfirmDelete(true);
        }}
        className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-border text-sm text-danger"
      >
        <Trash2 aria-hidden size={18} /> Excluir sessão
      </button>

      {confirmDelete && (
        <Modal
          title="Excluir sessão?"
          onClose={() => {
            setConfirmDelete(false);
          }}
          footer={
            <>
              <button
                type="button"
                className="min-h-12 flex-1 rounded-xl border border-border font-medium"
                onClick={() => {
                  setConfirmDelete(false);
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="min-h-12 flex-1 rounded-xl bg-danger font-semibold text-white"
                onClick={() => void remove()}
              >
                Excluir
              </button>
            </>
          }
        >
          <p className="text-sm text-muted">
            O treino de {formatLongDate(session.startedAt)} e suas {logs.length}{' '}
            {plural(logs.length, 'série', 'séries')} serão apagados definitivamente. Não dá para
            desfazer.
          </p>
        </Modal>
      )}
    </>
  );
}

function NotesField({ session }: { session: Session }) {
  const [text, setText] = useState(session.notes ?? '');
  return (
    <label className="mt-4 block">
      <span className="mb-1 block text-sm text-muted">Observação</span>
      <textarea
        value={text}
        rows={2}
        onChange={(e) => {
          setText(e.target.value);
        }}
        onBlur={() => {
          if (text.trim() !== (session.notes ?? '')) void updateSessionNotes(session.id, text);
        }}
        placeholder="Sem observação"
        className="w-full rounded-lg bg-surface p-3 text-text placeholder:text-muted"
      />
    </label>
  );
}
