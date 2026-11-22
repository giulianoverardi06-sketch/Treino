import { ChartLine, ChevronDown, ChevronUp, Pencil, Plus, SkipForward, Undo2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { ExerciseImage } from '@/components/ExerciseImage';
import { LETTER_STYLES } from '@/components/letterStyles';
import { useToast } from '@/components/Toast';
import {
  addSetRow,
  confirmSet,
  moveSessionEntry,
  removeSetRow,
  restoreEntry,
  setEntrySkipped,
  swapExercise,
  updateSet,
} from '@/db/sessionRepo';
import { lastPerformance, prefillFromLastSession } from '@/domain/prefill';
import { applyDrop, buildRows, propagateWeight } from '@/domain/sessionRows';
import type { Exercise, SessionEntry, SetLog, Slot } from '@/domain/types';
import { vibrate } from '@/lib/device';
import { describeSets, formatShortDate } from '@/lib/format';
import { useDraftStore, useEntryDrafts } from './draftStore';
import { SET_GRID, SetRow } from './SetRow';
import type { SessionData } from './useSessionData';

interface EntryCardProps {
  data: SessionData;
  entry: SessionEntry;
  slot: Slot | undefined;
  /** Séries desta entrada nesta sessão. */
  logs: SetLog[];
  expanded: boolean;
  isFirst: boolean;
  isLast: boolean;
  onToggle: () => void;
  /** Todas as séries planejadas confirmadas. */
  onCompleted: () => void;
}

const smallBtn =
  'flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm text-muted hover:text-text disabled:opacity-40';

function exerciseName(exercises: ReadonlyMap<string, Exercise>, id: string) {
  return exercises.get(id)?.name ?? 'Exercício removido';
}

export function EntryCard({
  data,
  entry,
  slot,
  logs,
  expanded,
  isFirst,
  isLast,
  onToggle,
  onCompleted,
}: EntryCardProps) {
  const { session, settings, exercises, sessions, historyLogs } = data;
  const exercise = exercises.get(entry.exerciseId);
  const style = LETTER_STYLES[session.letter];
  const drafts = useEntryDrafts(session.id, entry.id);
  const store = useDraftStore;
  const toast = useToast();
  const [editMode, setEditMode] = useState(false);
  const [lastConfirmed, setLastConfirmed] = useState<number | null>(null);

  const prefill = prefillFromLastSession({
    exerciseId: entry.exerciseId,
    plannedSets: entry.plannedSets,
    sessions,
    setLogs: historyLogs,
    defaultToFailure: settings.defaultToFailure,
    excludeSessionId: session.id,
    ...(slot?.startWeightKg !== undefined && entry.exerciseId === slot.primaryExerciseId
      ? { fallbackWeightKg: slot.startWeightKg }
      : {}),
  });
  const rows = buildRows(prefill, logs, drafts);
  const last = lastPerformance(entry.exerciseId, sessions, historyLogs, session.id);
  const done = rows.filter((r) => r.confirmed).length;
  const activeIndex = rows.find((r) => !r.confirmed)?.setIndex;
  const isLateral = entry.protocol === 'drop_lateral';
  const options = slot ? [slot.primaryExerciseId, ...slot.alternativeExerciseIds] : [];
  const canSwap = logs.length === 0;

  const patchDraft = useDraftStore.getState().patchRow;

  async function confirm(setIndex: number) {
    // Lê os rascunhos mais recentes (o blur do campo pode ter gravado agora mesmo).
    const fresh = buildRows(prefill, logs, store.getState().drafts[session.id]?.[entry.id] ?? {});
    const row = fresh.find((r) => r.setIndex === setIndex);
    if (!row) return;
    await confirmSet({
      sessionId: session.id,
      entryId: entry.id,
      exerciseId: entry.exerciseId,
      setIndex,
      weightKg: row.weightKg,
      toFailure: row.toFailure,
      ...(row.reps !== undefined ? { reps: row.reps } : {}),
    });
    vibrate();
    store.getState().clearRow(session.id, entry.id, setIndex);
    const changes = propagateWeight(fresh, setIndex, row.weightKg);
    if (changes.size) store.getState().setWeights(session.id, entry.id, changes, false);
    setLastConfirmed(setIndex);
    const remaining = fresh.filter((r) => !r.confirmed && r.setIndex !== setIndex).length;
    if (remaining === 0) onCompleted();
  }

  async function remove(setIndex: number) {
    const before = store.getState().drafts[session.id]?.[entry.id] ?? {};
    const snapshot = await removeSetRow(session.id, entry.id, setIndex);
    store.getState().removeRow(session.id, entry.id, setIndex);
    toast({
      message: `Série ${setIndex} removida`,
      actionLabel: 'Desfazer',
      onAction: () => {
        void restoreEntry(snapshot).then(() => {
          store.getState().replaceEntry(session.id, entry.id, before);
        });
      },
    });
  }

  function editRow(
    setIndex: number,
    logId: string | undefined,
    patch: {
      weightKg?: number;
      reps?: number | null;
      toFailure?: boolean;
    },
  ) {
    if (logId) {
      void updateSet(logId, patch);
    } else {
      patchDraft(session.id, entry.id, setIndex, {
        ...patch,
        ...(patch.weightKg !== undefined ? { touched: true } : {}),
      });
    }
  }

  async function swap(exerciseId: string) {
    if (exerciseId === entry.exerciseId) return;
    try {
      await swapExercise(session.id, entry.id, exerciseId);
      store.getState().replaceEntry(session.id, entry.id, {});
    } catch (e) {
      toast({ message: e instanceof Error ? e.message : 'Não foi possível trocar' });
    }
  }

  const headerId = `entry-${entry.id}`;
  return (
    <li
      className={`rounded-xl border bg-surface ${expanded ? 'border-border' : 'border-transparent'} ${
        entry.skipped ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-center">
        <button
          type="button"
          id={headerId}
          aria-expanded={expanded}
          onClick={onToggle}
          className="flex min-h-16 min-w-0 flex-1 items-center gap-3 p-3 text-left"
        >
          <ExerciseImage exercise={exercise} size="thumb" />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold">
              {exerciseName(exercises, entry.exerciseId)}
            </span>
            <span className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted">
              {entry.slotId && <span className="truncate">{entry.label}</span>}
              {entry.optional && (
                <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[0.7rem]">opcional</span>
              )}
              {entry.skipped && (
                <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[0.7rem]">pulado</span>
              )}
            </span>
            <span className="block truncate text-xs text-muted">
              {last
                ? `Última: ${describeSets(last.sets)} · ${formatShortDate(last.session.startedAt)}`
                : 'Primeira vez'}
            </span>
          </span>
          {!entry.skipped && (
            <span
              className={`shrink-0 text-sm font-semibold num ${done >= entry.plannedSets && done > 0 ? style.text : 'text-muted'}`}
            >
              {done}/{entry.plannedSets}
              <span className="sr-only"> séries</span>
            </span>
          )}
        </button>
        {entry.optional && !entry.skipped && done === 0 && !expanded && (
          <button
            type="button"
            className={`${smallBtn} mr-1`}
            onClick={() => void setEntrySkipped(session.id, entry.id, true)}
          >
            Pular
          </button>
        )}
      </div>

      {expanded && (
        <div className="flex flex-col gap-3 px-2 pb-3" role="region" aria-labelledby={headerId}>
          <div className="px-1">
            <ExerciseImage exercise={exercise} size="large" />
          </div>
          {(exercise?.notes ?? slot?.notes) && (
            <p className="px-1 text-sm text-muted">
              {[exercise?.notes, slot?.notes].filter(Boolean).join(' · ')}
            </p>
          )}

          {options.length > 1 && (
            <div className="px-1">
              <p className="mb-1 text-xs text-muted" id={`${headerId}-alt`}>
                Exercício nesta sessão
              </p>
              <div
                role="radiogroup"
                aria-labelledby={`${headerId}-alt`}
                className="flex flex-wrap gap-1.5"
              >
                {options.map((id, i) => {
                  const selected = id === entry.exerciseId;
                  return (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={!canSwap && !selected}
                      onClick={() => void swap(id)}
                      className={`min-h-11 rounded-lg border px-3 text-left text-sm ${
                        selected
                          ? 'border-text bg-surface-2 font-semibold'
                          : 'border-border text-muted hover:text-text disabled:opacity-40'
                      }`}
                    >
                      {exerciseName(exercises, id)}
                      {i === 0 && <span className="ml-1 text-xs text-muted">(principal)</span>}
                    </button>
                  );
                })}
              </div>
              {!canSwap && (
                <p className="mt-1 text-xs text-muted">
                  Para trocar, remova as séries registradas.
                </p>
              )}
            </div>
          )}

          {!entry.skipped && (
            <>
              <div className={`${SET_GRID} px-1 text-[0.7rem] text-muted`} aria-hidden>
                <span className="text-center">#</span>
                <span className="text-center">Carga (kg)</span>
                <span className="text-center">Reps</span>
                <span className="text-center">Falha</span>
                <span />
              </div>
              <ol className="flex flex-col gap-1" aria-label="Séries">
                {rows.map((row) => (
                  <SetRow
                    key={row.setIndex}
                    row={row}
                    incrementKg={exercise?.defaultIncrementKg ?? 2.5}
                    accentText={style.text}
                    editMode={editMode}
                    isActive={row.setIndex === activeIndex}
                    {...(isLateral ? { dropKg: settings.lateralDropKg } : {})}
                    askRpe={row.confirmed && row.setIndex === lastConfirmed}
                    onWeight={(kg) => {
                      editRow(row.setIndex, row.logId, { weightKg: kg });
                    }}
                    onReps={(reps) => {
                      editRow(row.setIndex, row.logId, { reps: reps ?? null });
                    }}
                    onFailure={(value) => {
                      editRow(row.setIndex, row.logId, { toFailure: value });
                    }}
                    onConfirm={() => void confirm(row.setIndex)}
                    onRemove={() => void remove(row.setIndex)}
                    onDrop={() => {
                      const changes = applyDrop(rows, row.setIndex, settings.lateralDropKg);
                      store.getState().setWeights(session.id, entry.id, changes, true);
                    }}
                    onRpe={(rpe) => {
                      if (row.logId) void updateSet(row.logId, { rpeNote: rpe ?? null });
                    }}
                  />
                ))}
              </ol>
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  className={smallBtn}
                  onClick={() => void addSetRow(session.id, entry.id)}
                >
                  <Plus aria-hidden size={16} /> Série
                </button>
                {rows.length > 0 && (
                  <button
                    type="button"
                    className={smallBtn}
                    aria-pressed={editMode}
                    onClick={() => {
                      setEditMode((v) => !v);
                    }}
                  >
                    <Pencil aria-hidden size={16} />{' '}
                    {editMode ? 'Concluir edição' : 'Editar séries'}
                  </button>
                )}
              </div>
            </>
          )}

          <div className="flex flex-wrap items-center gap-1 border-t border-border pt-2">
            <button
              type="button"
              className={smallBtn}
              disabled={isFirst}
              onClick={() => void moveSessionEntry(session.id, entry.id, -1)}
              aria-label="Mover para cima"
            >
              <ChevronUp aria-hidden size={18} />
            </button>
            <button
              type="button"
              className={smallBtn}
              disabled={isLast}
              onClick={() => void moveSessionEntry(session.id, entry.id, 1)}
              aria-label="Mover para baixo"
            >
              <ChevronDown aria-hidden size={18} />
            </button>
            <Link to={`/exercicio/${entry.exerciseId}`} className={smallBtn}>
              <ChartLine aria-hidden size={16} /> Progresso
            </Link>
            <span className="flex-1" />
            {entry.skipped ? (
              <button
                type="button"
                className={smallBtn}
                onClick={() => void setEntrySkipped(session.id, entry.id, false)}
              >
                <Undo2 aria-hidden size={16} /> Retomar
              </button>
            ) : (
              <button
                type="button"
                className={smallBtn}
                onClick={() => {
                  void setEntrySkipped(session.id, entry.id, true);
                  onToggle();
                }}
              >
                <SkipForward aria-hidden size={16} /> Pular
              </button>
            )}
          </div>
        </div>
      )}
    </li>
  );
}
