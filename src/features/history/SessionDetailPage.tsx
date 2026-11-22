import { useLiveQuery } from 'dexie-react-hooks';
import { Ban, ChevronRight, Flame, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { PageHeader } from '@/components/PageHeader';
import { RepsInput, WeightInput } from '@/components/SetInputs';
import { LetterTile, Tile } from '@/components/Sign';
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

const SET_COLS = 'grid grid-cols-[2.5rem_minmax(0,1fr)_3.5rem_2.75rem] items-center gap-2';

function SessionDetail({ data }: { data: DetailData }) {
  const { session, template, exercises, logs } = data;
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);

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
      <PageHeader
        title={`Treino ${session.letter}`}
        backTo="/historico"
        historyBack
        subtitle={template?.name}
        actions={<LetterTile letter={session.letter} size="lg" />}
      />
      <dl className="-mt-1 mb-6 rounded-[4px] bg-tile px-4 py-1 text-on-tile num">
        <div className="flex min-h-12 items-center justify-between gap-3 border-b border-white/15">
          <dt className="text-sm text-white/70">Data</dt>
          <dd className="text-base font-bold first-letter:uppercase">
            {formatLongDate(session.startedAt)}
          </dd>
        </div>
        <div className="flex min-h-12 items-center justify-between gap-3 border-b border-white/15">
          <dt className="text-sm text-white/70">Horário</dt>
          <dd className="text-base font-bold">
            {formatTime(session.startedAt)}
            {session.finishedAt && `–${formatTime(session.finishedAt)}`}
            {duration !== undefined && ` · ${formatDuration(duration)}`}
          </dd>
        </div>
        <div className="flex min-h-12 items-center justify-between gap-3">
          <dt className="text-sm text-white/70">Séries</dt>
          <dd className="text-base font-bold">
            {logs.length} {plural(logs.length, 'série', 'séries')}
          </dd>
        </div>
      </dl>
      {session.status === 'descartada' && (
        <p className="-mt-3 mb-5 flex items-center gap-3 text-base">
          <Tile icon={Ban} size="sm" />
          Sessão descartada: não conta no histórico.
        </p>
      )}

      <ol className="border-t border-border" aria-label="Exercícios">
        {orderedEntries(session).map((entry, index) => {
          const entryLogs = logsByEntry.get(entry.id) ?? [];
          const exercise = exercises.get(entry.exerciseId);
          const status = entry.skipped ? 'pulado' : entryLogs.length === 0 ? 'não feito' : null;
          return (
            <li key={entry.id} className="border-b border-border py-3">
              <div className="flex items-start gap-3">
                <Tile>{index + 1}</Tile>
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/exercicio/${entry.exerciseId}`}
                    className="inline-flex min-h-11 items-center gap-1 text-lg leading-tight font-bold"
                  >
                    {exercise?.name ?? 'Exercício removido'}
                    <ChevronRight aria-hidden size={20} className="shrink-0 text-muted" />
                  </Link>
                  <p className="-mt-1.5 text-sm text-muted">
                    {[entry.slotId ? entry.label : null, status].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </div>

              {entryLogs.length > 0 && (
                <div className="mt-2 pl-14">
                  <div
                    className={`${SET_COLS} border-b border-border pb-1 text-xs font-semibold text-muted`}
                    aria-hidden
                  >
                    <span className="text-center">Série</span>
                    <span className="text-center">Carga (kg)</span>
                    <span className="text-center">Reps</span>
                    <span className="text-center">Falha</span>
                  </div>
                  <ol
                    className="mt-1 flex flex-col"
                    aria-label={`Séries de ${exercise?.name ?? 'exercício'}`}
                  >
                    {entryLogs.map((log, i) => {
                      const n = i + 1;
                      return (
                        <li key={log.id} className={SET_COLS}>
                          <span className="text-center text-base font-bold num">{n}</span>
                          <WeightInput
                            key={log.weightKg}
                            value={log.weightKg}
                            label={`Carga da série ${n} de ${exercise?.name ?? 'exercício'} (kg)`}
                            onCommit={(kg) => void updateSet(log.id, { weightKg: kg })}
                            className="h-12 text-xl font-bold"
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
                            className={`flex size-11 items-center justify-center rounded-[3px] ${
                              log.toFailure ? 'text-text' : 'text-muted/50'
                            }`}
                          >
                            <Flame
                              aria-hidden
                              size={22}
                              fill={log.toFailure ? 'currentColor' : 'none'}
                            />
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <NotesField session={session} />

      <div className="mt-10 border-t border-border pt-6">
        <Button
          variant="outline"
          icon={Trash2}
          className="w-full"
          onClick={() => {
            setConfirmDelete(true);
          }}
        >
          Excluir sessão
        </Button>
      </div>

      {confirmDelete && (
        <Modal
          title="Excluir sessão?"
          onClose={() => {
            setConfirmDelete(false);
          }}
          footer={
            <>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setConfirmDelete(false);
                }}
              >
                Cancelar
              </Button>
              <Button variant="solid" className="flex-1" onClick={() => void remove()}>
                Excluir
              </Button>
            </>
          }
        >
          <p className="text-base text-muted">
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
    <label className="mt-6 block">
      <span className="mb-1 block text-base font-semibold">Observação</span>
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
        className="w-full rounded-[3px] border-2 border-edge bg-surface p-3 text-base text-text"
      />
    </label>
  );
}
