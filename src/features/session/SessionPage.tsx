import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { LETTER_STYLES } from '@/components/letterStyles';
import { Modal } from '@/components/Modal';
import { PageHeader } from '@/components/PageHeader';
import { addSessionEntry, discardSession, finishSession } from '@/db/sessionRepo';
import { orderedEntries } from '@/domain/sessionFactory';
import type { SessionEntry } from '@/domain/types';
import { useWakeLock } from '@/lib/device';
import { AddExerciseSheet } from './AddExerciseSheet';
import { useDraftStore } from './draftStore';
import { EntryCard } from './EntryCard';
import { FinishSheet } from './FinishSheet';
import { useSessionData, type SessionData } from './useSessionData';

export function SessionPage() {
  const { id = '' } = useParams();
  const data = useSessionData(id);

  if (data === undefined) return <p className="text-sm text-muted">Carregando…</p>;
  if (data === null) {
    return (
      <>
        <PageHeader title="Sessão" backTo="/" />
        <p className="text-sm text-muted">Sessão não encontrada.</p>
      </>
    );
  }
  if (data.session.status !== 'em_andamento') {
    return <Navigate to={`/historico/${data.session.id}`} replace />;
  }
  return <ActiveSession data={data} />;
}

type Sheet = 'add' | 'finish' | 'discard' | null;

function ActiveSession({ data }: { data: SessionData }) {
  const { session, template, sessionLogs } = data;
  const navigate = useNavigate();
  const style = LETTER_STYLES[session.letter];
  const entries = orderedEntries(session);
  const [sheet, setSheet] = useState<Sheet>(null);
  /** `undefined` = automático (primeiro exercício incompleto); `null` = todos recolhidos. */
  const [expandedId, setExpandedId] = useState<string | null | undefined>(undefined);

  useWakeLock(data.settings.wakeLock);

  const logsByEntry = new Map<string, typeof sessionLogs>();
  for (const l of [...sessionLogs].sort((a, b) => a.setIndex - b.setIndex)) {
    const list = logsByEntry.get(l.entryId);
    if (list) list.push(l);
    else logsByEntry.set(l.entryId, [l]);
  }
  const isIncomplete = (e: SessionEntry) =>
    !e.skipped && (logsByEntry.get(e.id)?.length ?? 0) < e.plannedSets;
  const autoExpanded = entries.find(isIncomplete)?.id ?? null;
  const expanded = expandedId === undefined ? autoExpanded : expandedId;

  const slotOf = (e: SessionEntry) => template?.slots.find((s) => s.id === e.slotId);

  function expandAndScroll(entryId: string | null) {
    setExpandedId(entryId);
    if (entryId) {
      requestAnimationFrame(() => {
        document.getElementById(`entry-${entryId}`)?.scrollIntoView({ block: 'start' });
      });
    }
  }

  function nextIncompleteAfter(entryId: string) {
    const i = entries.findIndex((e) => e.id === entryId);
    return [...entries.slice(i + 1), ...entries.slice(0, i)].find(isIncomplete)?.id ?? null;
  }

  // Sai da tela antes de gravar, para o redirecionamento de "sessão encerrada" não disparar.
  async function finish(notes: string) {
    void navigate('/', { replace: true });
    await finishSession(session.id, notes);
    useDraftStore.getState().clearSession(session.id);
  }

  async function discard() {
    void navigate('/', { replace: true });
    await discardSession(session.id);
    useDraftStore.getState().clearSession(session.id);
  }

  return (
    <>
      <PageHeader
        title={`Treino ${session.letter}`}
        backTo="/"
        actions={<span className={`h-2 w-8 rounded-full ${style.bg}`} aria-hidden />}
      />
      {template && <p className="-mt-3 mb-4 text-sm text-muted">{template.name}</p>}

      <ol className="flex flex-col gap-2" aria-label="Exercícios">
        {entries.map((entry, i) => (
          <EntryCard
            key={entry.id}
            data={data}
            entry={entry}
            slot={slotOf(entry)}
            logs={logsByEntry.get(entry.id) ?? []}
            expanded={expanded === entry.id}
            isFirst={i === 0}
            isLast={i === entries.length - 1}
            onToggle={() => {
              setExpandedId(expanded === entry.id ? null : entry.id);
            }}
            onCompleted={() => {
              expandAndScroll(nextIncompleteAfter(entry.id));
            }}
          />
        ))}
      </ol>

      <button
        type="button"
        className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border text-sm text-muted hover:text-text"
        onClick={() => {
          setSheet('add');
        }}
      >
        <Plus aria-hidden size={18} /> Exercício
      </button>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-[480px] gap-2 p-3">
          <button
            type="button"
            aria-label="Descartar sessão"
            className="flex min-h-12 w-14 items-center justify-center rounded-xl border border-border text-muted hover:text-danger"
            onClick={() => {
              setSheet('discard');
            }}
          >
            <Trash2 aria-hidden size={20} />
          </button>
          <button
            type="button"
            className={`min-h-12 flex-1 rounded-xl font-semibold text-bg ${style.bg}`}
            onClick={() => {
              setSheet('finish');
            }}
          >
            Finalizar treino
          </button>
        </div>
      </div>

      {sheet === 'add' && (
        <AddExerciseSheet
          exercises={data.exercises}
          onClose={() => {
            setSheet(null);
          }}
          onPick={(exerciseId) => {
            setSheet(null);
            void addSessionEntry(session.id, exerciseId).then(expandAndScroll);
          }}
        />
      )}

      {sheet === 'finish' && (
        <FinishSheet
          data={data}
          onClose={() => {
            setSheet(null);
          }}
          onConfirm={(notes) => void finish(notes)}
        />
      )}

      {sheet === 'discard' && (
        <Modal
          title="Descartar sessão?"
          onClose={() => {
            setSheet(null);
          }}
          footer={
            <>
              <button
                type="button"
                className="min-h-12 flex-1 rounded-xl border border-border font-medium"
                onClick={() => {
                  setSheet(null);
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="min-h-12 flex-1 rounded-xl bg-danger font-semibold text-white"
                onClick={() => void discard()}
              >
                Descartar
              </button>
            </>
          }
        >
          <p className="text-sm text-muted">
            As séries registradas nesta sessão não vão contar no histórico nem na progressão.
          </p>
        </Modal>
      )}
    </>
  );
}
