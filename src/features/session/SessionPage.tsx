import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { PageHeader } from '@/components/PageHeader';
import { LetterTile } from '@/components/Sign';
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

  if (data === undefined) return <p className="text-base text-muted">Carregando…</p>;
  if (data === null) {
    return (
      <>
        <PageHeader title="Sessão" backTo="/" />
        <p className="text-base text-muted">Sessão não encontrada.</p>
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
  const { session, template, sessionLogs, exercises } = data;
  const navigate = useNavigate();
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
  const doneOf = (e: SessionEntry) => logsByEntry.get(e.id)?.length ?? 0;
  const isIncomplete = (e: SessionEntry) => !e.skipped && doneOf(e) < e.plannedSets;
  const autoExpanded = entries.find(isIncomplete)?.id ?? null;
  const expanded = expandedId === undefined ? autoExpanded : expandedId;

  const slotOf = (e: SessionEntry) => template?.slots.find((s) => s.id === e.slotId);

  // A placa diz a próxima decisão: o exercício aberto (ou o próximo incompleto) e a série da vez.
  const current =
    entries.find((e) => e.id === expanded && isIncomplete(e)) ?? entries.find(isIncomplete);
  const totalPlanned = entries.filter((e) => !e.skipped).reduce((n, e) => n + e.plannedSets, 0);

  function expandAndScroll(entryId: string | null) {
    setExpandedId(entryId);
    if (entryId) {
      requestAnimationFrame(() => {
        document
          .getElementById(`entry-${entryId}`)
          ?.scrollIntoView({ block: 'start', behavior: 'smooth' });
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
      <header className="sticky top-0 z-20 -mx-4 -mt-4 mb-2 bg-sign px-4 pt-3 pb-3 text-on-sign">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            aria-label="Voltar ao início"
            className="flex size-11 shrink-0 items-center justify-center rounded-[3px] bg-tile text-on-tile"
          >
            <ArrowLeft aria-hidden size={24} strokeWidth={2.5} />
          </Link>
          <LetterTile letter={session.letter} />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl leading-tight font-bold">Treino {session.letter}</h1>
            {template && (
              <p className="truncate text-sm font-semibold text-on-sign-muted">{template.name}</p>
            )}
          </div>
          <span className="text-xl font-bold num">
            {sessionLogs.length}/{totalPlanned}
            <span className="sr-only"> séries registradas</span>
          </span>
        </div>
        <p
          key={current ? `${current.id}-${doneOf(current)}` : 'fim'}
          className="mt-2 flap border-t-2 border-on-sign/15 pt-2 text-lg leading-tight font-bold"
          aria-live="polite"
        >
          {current ? (
            <>
              <span className="num">
                Série {doneOf(current) + 1} de {current.plannedSets}
              </span>
              <span className="font-semibold text-on-sign-muted">
                {' · '}
                {exercises.get(current.exerciseId)?.name ?? current.label}
              </span>
            </>
          ) : (
            'Tudo registrado. Finalize o treino.'
          )}
        </p>
      </header>

      <ol className="flex flex-col" aria-label="Exercícios">
        {entries.map((entry, i) => (
          <EntryCard
            key={entry.id}
            data={data}
            entry={entry}
            position={i + 1}
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
        className="mt-4 flex min-h-14 w-full items-center gap-3 rounded-[3px] border-2 border-dashed border-edge px-3 text-base font-semibold text-muted hover:text-text"
        onClick={() => {
          setSheet('add');
        }}
      >
        <Plus aria-hidden size={22} strokeWidth={2.5} /> Exercício
      </button>

      <div className="fixed inset-x-0 bottom-0 z-20 bg-tile pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-[480px] items-center gap-8 p-3">
          <button
            type="button"
            aria-label="Descartar sessão"
            className="flex size-14 shrink-0 items-center justify-center rounded-[4px] border-2 border-white/35 text-white/80 hover:border-white hover:text-white"
            onClick={() => {
              setSheet('discard');
            }}
          >
            <Trash2 aria-hidden size={22} />
          </button>
          {/* Só vira amarelo (caminho) quando não há mais série a registrar. */}
          <Button
            variant={current ? 'onInk' : 'go'}
            arrow
            className="flex-1 justify-start"
            onClick={() => {
              setSheet('finish');
            }}
          >
            Finalizar treino
          </Button>
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
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setSheet(null);
                }}
              >
                Cancelar
              </Button>
              <Button variant="solid" className="flex-1" onClick={() => void discard()}>
                Descartar
              </Button>
            </>
          }
        >
          <p className="text-base text-muted">
            As séries registradas nesta sessão não vão contar no histórico nem na progressão.
          </p>
        </Modal>
      )}
    </>
  );
}
