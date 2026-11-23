import { ArrowUpToLine, Minus, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/Button';
import { ExercisePicker } from '@/components/ExercisePicker';
import { Modal } from '@/components/Modal';
import { Segmented } from '@/components/PeriodFilter';
import { parseWeight } from '@/domain/sessionRows';
import {
  MAX_PLANNED_SETS,
  slotToDraft,
  validateSlot,
  type SlotDraft,
  type SlotErrors,
} from '@/domain/program';
import type { Exercise, Slot, SlotProtocol } from '@/domain/types';
import { formatNumber } from '@/lib/format';

interface SlotSheetProps {
  slot: Slot;
  exercises: ReadonlyMap<string, Exercise>;
  onSave: (draft: SlotDraft) => void;
  onRemove: () => void;
  onClose: () => void;
}

const PROTOCOLS = [
  { value: 'padrao', label: 'Padrão' },
  { value: 'drop_lateral', label: 'Drop lateral' },
] as const satisfies readonly { value: SlotProtocol; label: string }[];

const field = 'w-full rounded-[3px] border-2 border-edge bg-surface px-3 text-base text-text';
const label = 'mb-1 block text-base font-semibold';
const rowBtn =
  'flex min-h-11 items-center gap-1.5 rounded-[3px] px-2 text-sm font-semibold text-muted hover:bg-surface-2 hover:text-text';

/** Editar um slot: rótulo, principal, alternativas, séries, opcional, protocolo, carga inicial, notas. */
export function SlotSheet({ slot, exercises, onSave, onRemove, onClose }: SlotSheetProps) {
  const [draft, setDraft] = useState<SlotDraft>(() => slotToDraft(slot));
  const [errors, setErrors] = useState<SlotErrors>({});
  const [picking, setPicking] = useState<'primary' | 'alternative' | null>(null);
  const [weightText, setWeightText] = useState(
    draft.startWeightKg === undefined ? '' : formatNumber(draft.startWeightKg),
  );

  const name = (id: string) => exercises.get(id)?.name ?? 'Exercício removido';
  const patch = (p: Partial<SlotDraft>) => {
    setDraft((d) => ({ ...d, ...p }));
  };

  if (picking) {
    const chosen = [draft.primaryExerciseId, ...draft.alternativeExerciseIds];
    return (
      <Modal
        title={picking === 'primary' ? 'Exercício principal' : 'Adicionar alternativa'}
        onClose={() => {
          setPicking(null);
        }}
      >
        <ExercisePicker
          exercises={exercises}
          exclude={chosen}
          onPick={(id) => {
            if (picking === 'primary') {
              const wasDefaultLabel = draft.label === name(draft.primaryExerciseId);
              patch({
                primaryExerciseId: id,
                alternativeExerciseIds: draft.alternativeExerciseIds.filter((a) => a !== id),
                ...(wasDefaultLabel ? { label: name(id) } : {}),
              });
            } else {
              patch({ alternativeExerciseIds: [...draft.alternativeExerciseIds, id] });
            }
            setPicking(null);
          }}
        />
      </Modal>
    );
  }

  function save() {
    const weight = weightText.trim() === '' ? undefined : parseWeight(weightText);
    const next = { ...draft, startWeightKg: weight };
    const found = validateSlot(next);
    setErrors(found);
    if (Object.keys(found).length === 0) onSave(next);
  }

  return (
    <Modal
      title="Editar exercício do treino"
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" className="flex-1" onClick={onRemove}>
            Remover
          </Button>
          <Button variant="solid" className="flex-[2]" onClick={save}>
            Salvar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div>
          <label className="block">
            <span className={label}>Nome no treino</span>
            <input
              value={draft.label}
              onChange={(e) => {
                patch({ label: e.target.value });
              }}
              className={`${field} h-12`}
              aria-invalid={errors.label ? true : undefined}
              aria-describedby={errors.label ? 'erro-rotulo' : undefined}
            />
          </label>
          {errors.label && (
            <p id="erro-rotulo" className="mt-1 text-sm font-semibold">
              {errors.label}
            </p>
          )}
        </div>

        <section aria-labelledby="slot-exercises">
          <h3 id="slot-exercises" className={label}>
            Exercícios
          </h3>
          <ul className="rounded-[4px] border-2 border-edge bg-surface px-3">
            <li className="flex min-h-14 items-center gap-2 border-b border-border py-1">
              <span className="min-w-0 flex-1">
                <span className="block text-base font-bold">{name(draft.primaryExerciseId)}</span>
                <span className="block text-sm text-muted">Principal</span>
              </span>
              <button
                type="button"
                className={rowBtn}
                onClick={() => {
                  setPicking('primary');
                }}
              >
                Trocar
              </button>
            </li>
            {draft.alternativeExerciseIds.map((id) => (
              <li
                key={id}
                className="flex min-h-14 items-center gap-1 border-b border-border py-1 last:border-b-0"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-base">{name(id)}</span>
                  <span className="block text-sm text-muted">Alternativa</span>
                </span>
                <button
                  type="button"
                  className={rowBtn}
                  aria-label={`Tornar ${name(id)} o principal`}
                  onClick={() => {
                    patch({
                      primaryExerciseId: id,
                      alternativeExerciseIds: draft.alternativeExerciseIds.map((a) =>
                        a === id ? draft.primaryExerciseId : a,
                      ),
                    });
                  }}
                >
                  <ArrowUpToLine aria-hidden size={18} /> Principal
                </button>
                <button
                  type="button"
                  className={`${rowBtn} w-11 justify-center`}
                  aria-label={`Remover alternativa ${name(id)}`}
                  onClick={() => {
                    patch({
                      alternativeExerciseIds: draft.alternativeExerciseIds.filter((a) => a !== id),
                    });
                  }}
                >
                  <X aria-hidden size={18} />
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className={`${rowBtn} mt-1`}
            onClick={() => {
              setPicking('alternative');
            }}
          >
            <Plus aria-hidden size={18} strokeWidth={2.5} /> Alternativa
          </button>
        </section>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className={label} id="slot-sets">
              Séries
            </span>
            <div
              className="flex items-center rounded-[3px] border-2 border-edge"
              role="group"
              aria-labelledby="slot-sets"
            >
              <button
                type="button"
                aria-label="Menos uma série"
                disabled={draft.plannedSets <= 1}
                className="flex h-11 w-11 items-center justify-center disabled:opacity-30"
                onClick={() => {
                  patch({ plannedSets: draft.plannedSets - 1 });
                }}
              >
                <Minus aria-hidden size={20} strokeWidth={2.5} />
              </button>
              <span className="flex-1 text-center text-xl font-bold num" aria-live="polite">
                {draft.plannedSets}
              </span>
              <button
                type="button"
                aria-label="Mais uma série"
                disabled={draft.plannedSets >= MAX_PLANNED_SETS}
                className="flex h-11 w-11 items-center justify-center disabled:opacity-30"
                onClick={() => {
                  patch({ plannedSets: draft.plannedSets + 1 });
                }}
              >
                <Plus aria-hidden size={20} strokeWidth={2.5} />
              </button>
            </div>
            {errors.plannedSets && (
              <span className="mt-1 block text-sm font-semibold">{errors.plannedSets}</span>
            )}
          </div>

          <label className="block">
            <span className={label}>Carga inicial</span>
            <span className="relative block">
              <input
                inputMode="decimal"
                value={weightText}
                placeholder="—"
                onChange={(e) => {
                  setWeightText(e.target.value);
                }}
                className={`${field} h-12 pr-10 num`}
              />
              <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted">
                kg
              </span>
            </span>
          </label>
        </div>

        <label className="flex min-h-12 items-center justify-between gap-3">
          <span>
            <span className="block text-base font-semibold">Opcional</span>
            <span className="block text-sm text-muted">Aparece na sessão com o botão Pular.</span>
          </span>
          <input
            type="checkbox"
            checked={draft.optional}
            onChange={(e) => {
              patch({ optional: e.target.checked });
            }}
            className="size-6 accent-current"
          />
        </label>

        <div>
          <span className={label}>Protocolo</span>
          <Segmented
            label="Protocolo"
            value={draft.protocol}
            options={PROTOCOLS}
            onChange={(protocol) => {
              patch({ protocol });
            }}
          />
          {draft.protocol === 'drop_lateral' && (
            <p className="mt-1 text-sm text-muted">
              Mostra o atalho “reduzir” na série da vez e a métrica das séries iniciais.
            </p>
          )}
        </div>

        <label className="block">
          <span className={label}>Notas</span>
          <textarea
            value={draft.notes ?? ''}
            rows={2}
            onChange={(e) => {
              patch({ notes: e.target.value });
            }}
            className={`${field} py-2`}
          />
        </label>
      </div>
    </Modal>
  );
}
