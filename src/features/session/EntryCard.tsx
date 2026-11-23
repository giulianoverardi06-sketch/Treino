import {
  ChartLine,
  Check,
  ChevronDown,
  ChevronUp,
  Pencil,
  Plus,
  SkipForward,
  Undo2,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { ExerciseImage } from '@/components/ExerciseImage';
import { Tile } from '@/components/Sign';
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
import { MUSCLE_LABELS } from '@/domain/labels';
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
  /** Posição na sequência (1..n). */
  position: number;
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

const lineBtn =
  'flex min-h-11 items-center gap-2 rounded-[3px] px-3 text-base font-semibold text-muted hover:bg-surface-2 hover:text-text disabled:opacity-35';

function exerciseName(exercises: ReadonlyMap<string, Exercise>, id: string) {
  return exercises.get(id)?.name ?? 'Exercício removido';
}

export function EntryCard({
  data,
  entry,
  position,
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
  const complete = done > 0 && done >= entry.plannedSets;
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
    patch: { weightKg?: number; reps?: number | null; toFailure?: boolean },
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
  const muscle = exercise?.primaryMuscles[0];
  const subline = [
    entry.slotId ? entry.label : 'Adicionado na hora',
    muscle ? MUSCLE_LABELS[muscle] : null,
    entry.optional ? 'opcional' : null,
    entry.skipped ? 'pulado' : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <li
      className={
        expanded
          ? '-mx-4 border-y-2 border-edge bg-surface px-4 pb-4'
          : `border-b border-border ${entry.skipped ? 'opacity-55' : ''}`
      }
    >
      <div className="flex items-center">
        <button
          type="button"
          id={headerId}
          aria-expanded={expanded}
          onClick={onToggle}
          className="flex min-h-[4.5rem] min-w-0 flex-1 items-center gap-3 py-3 text-left"
        >
          {complete ? <Tile icon={Check} inverse /> : <Tile>{position}</Tile>}
          <ExerciseImage exercise={exercise} size="thumb" />
          <span className="min-w-0 flex-1">
            <span className="block text-lg leading-tight font-bold">
              {exerciseName(exercises, entry.exerciseId)}
            </span>
            <span className="mt-0.5 block truncate text-sm text-muted">{subline}</span>
            {expanded && (
              <span className="mt-0.5 block text-sm text-muted num">
                {last
                  ? `Última: ${describeSets(last.sets)} · ${formatShortDate(last.session.startedAt)}`
                  : 'Primeira vez'}
              </span>
            )}
          </span>
          {!entry.skipped && (
            <span className="shrink-0 text-xl font-bold num">
              {done}/{entry.plannedSets}
              <span className="sr-only"> séries</span>
            </span>
          )}
        </button>
        {entry.optional && !entry.skipped && done === 0 && !expanded && (
          <button
            type="button"
            className={`${lineBtn} ml-1`}
            onClick={() => void setEntrySkipped(session.id, entry.id, true)}
          >
            Pular
          </button>
        )}
      </div>

      {expanded && (
        <div className="flex flex-col gap-4" role="region" aria-labelledby={headerId}>
          <ExerciseImage exercise={exercise} size="compact" />
          {(exercise?.notes ?? slot?.notes) && (
            <p className="text-base text-muted">
              {[exercise?.notes, slot?.notes].filter(Boolean).join(' · ')}
            </p>
          )}

          {options.length > 1 && (
            <fieldset>
              <legend className="mb-1.5 text-sm font-semibold text-muted">
                Exercício nesta sessão
              </legend>
              <div
                role="radiogroup"
                aria-label="Exercício nesta sessão"
                className="flex flex-col gap-1"
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
                      className={`flex min-h-12 items-center gap-3 rounded-[3px] border-2 px-3 text-left text-base ${
                        selected
                          ? 'border-text font-semibold'
                          : 'border-border text-muted hover:border-edge hover:text-text disabled:opacity-35'
                      }`}
                    >
                      <span
                        aria-hidden
                        className={`size-4 shrink-0 rounded-full border-2 ${
                          selected ? 'border-text bg-text' : 'border-current'
                        }`}
                      />
                      <span className="flex-1">{exerciseName(exercises, id)}</span>
                      {i === 0 && <span className="text-sm text-muted">principal</span>}
                    </button>
                  );
                })}
              </div>
              {!canSwap && (
                <p className="mt-1.5 text-sm text-muted">
                  Para trocar, remova as séries registradas.
                </p>
              )}
            </fieldset>
          )}

          {!entry.skipped && (
            <div>
              <div
                className={`${SET_GRID} border-b border-border px-1.5 pb-1 text-xs font-semibold text-muted`}
                aria-hidden
              >
                <span className="text-center">Série</span>
                <span className="text-center">Carga (kg)</span>
                <span className="text-center">Reps</span>
                <span className="text-center">Falha</span>
                <span />
              </div>
              <ol className="mt-1 flex flex-col gap-1" aria-label="Séries">
                {rows.map((row) => (
                  <SetRow
                    key={row.setIndex}
                    row={row}
                    incrementKg={exercise?.defaultIncrementKg ?? 2.5}
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
              <div className="mt-2 flex flex-wrap gap-1">
                <button
                  type="button"
                  className={lineBtn}
                  onClick={() => void addSetRow(session.id, entry.id)}
                >
                  <Plus aria-hidden size={18} strokeWidth={2.5} /> Série
                </button>
                {rows.length > 0 && (
                  <button
                    type="button"
                    className={lineBtn}
                    aria-pressed={editMode}
                    onClick={() => {
                      setEditMode((v) => !v);
                    }}
                  >
                    <Pencil aria-hidden size={18} />{' '}
                    {editMode ? 'Concluir edição' : 'Editar séries'}
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-1 border-t border-border pt-2">
            <button
              type="button"
              className={lineBtn}
              disabled={isFirst}
              onClick={() => void moveSessionEntry(session.id, entry.id, -1)}
              aria-label="Mover para cima"
            >
              <ChevronUp aria-hidden size={22} />
            </button>
            <button
              type="button"
              className={lineBtn}
              disabled={isLast}
              onClick={() => void moveSessionEntry(session.id, entry.id, 1)}
              aria-label="Mover para baixo"
            >
              <ChevronDown aria-hidden size={22} />
            </button>
            <Link to={`/exercicio/${entry.exerciseId}`} className={lineBtn}>
              <ChartLine aria-hidden size={18} /> Progresso
            </Link>
            <span className="flex-1" />
            {entry.skipped ? (
              <button
                type="button"
                className={lineBtn}
                onClick={() => void setEntrySkipped(session.id, entry.id, false)}
              >
                <Undo2 aria-hidden size={18} /> Retomar
              </button>
            ) : (
              <button
                type="button"
                className={lineBtn}
                onClick={() => {
                  void setEntrySkipped(session.id, entry.id, true);
                  onToggle();
                }}
              >
                <SkipForward aria-hidden size={18} /> Pular
              </button>
            )}
          </div>
        </div>
      )}
    </li>
  );
}
