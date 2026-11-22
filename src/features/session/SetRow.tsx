import { ArrowDown, Check, Flame, Minus, Plus, Trash2 } from 'lucide-react';
import { RepsInput, WeightInput } from '@/components/SetInputs';
import { stepWeight, type SessionRow } from '@/domain/sessionRows';
import type { RpeNote } from '@/domain/types';
import { formatNumber } from '@/lib/format';

export interface SetRowProps {
  row: SessionRow;
  incrementKg: number;
  accentText: string;
  /** Modo edição da entrada: mostra a lixeira no lugar do ✓. */
  editMode: boolean;
  /** Primeira série não confirmada (recebe o atalho do protocolo lateral). */
  isActive: boolean;
  /** Redução do "↓ reduzir"; ausente fora do protocolo lateral. */
  dropKg?: number;
  /** Mostrar "como foi?" (última série confirmada). */
  askRpe: boolean;
  onWeight: (kg: number) => void;
  onReps: (reps: number | undefined) => void;
  onFailure: (value: boolean) => void;
  onConfirm: () => void;
  onRemove: () => void;
  onDrop: () => void;
  onRpe: (rpe: RpeNote | undefined) => void;
}

/** Colunas: série | carga (stepper) | reps | falha | ✓ */
export const SET_GRID =
  'grid grid-cols-[1.25rem_minmax(0,1fr)_3.25rem_2.75rem_2.75rem] items-center gap-1.5';

const iconBtn =
  'flex size-11 items-center justify-center rounded-lg transition-colors disabled:opacity-40';

const RPE_OPTIONS: { value: RpeNote; label: string }[] = [
  { value: 'facil', label: 'Fácil' },
  { value: 'ok', label: 'Ok' },
  { value: 'dificil', label: 'Difícil' },
];

export function SetRow({
  row,
  incrementKg,
  accentText,
  editMode,
  isActive,
  dropKg,
  askRpe,
  onWeight,
  onReps,
  onFailure,
  onConfirm,
  onRemove,
  onDrop,
  onRpe,
}: SetRowProps) {
  const n = row.setIndex;
  return (
    <li className={`rounded-lg px-1 py-1 ${row.confirmed ? 'bg-surface-2' : ''}`}>
      <div className={SET_GRID}>
        <span
          className={`text-center text-sm font-semibold num ${row.confirmed ? accentText : 'text-muted'}`}
        >
          {n}
        </span>

        <div className="flex items-center gap-0.5">
          <button
            type="button"
            aria-label={`Diminuir carga da série ${n}`}
            className={`${iconBtn} shrink-0 text-muted hover:text-text`}
            disabled={row.weightKg <= 0}
            onClick={() => {
              onWeight(stepWeight(row.weightKg, incrementKg, -1));
            }}
          >
            <Minus aria-hidden size={18} />
          </button>
          <WeightInput
            key={row.weightKg}
            value={row.weightKg}
            label={`Carga da série ${n} (kg)`}
            onCommit={onWeight}
          />
          <button
            type="button"
            aria-label={`Aumentar carga da série ${n}`}
            className={`${iconBtn} shrink-0 text-muted hover:text-text`}
            onClick={() => {
              onWeight(stepWeight(row.weightKg, incrementKg, 1));
            }}
          >
            <Plus aria-hidden size={18} />
          </button>
        </div>

        <RepsInput
          key={row.reps ?? 'vazio'}
          value={row.reps}
          placeholder={row.lastReps === undefined ? '–' : String(row.lastReps)}
          label={`Repetições da série ${n} (opcional)`}
          onCommit={onReps}
        />

        <button
          type="button"
          aria-label={`Série ${n} até a falha`}
          aria-pressed={row.toFailure}
          className={`${iconBtn} ${row.toFailure ? accentText : 'text-muted/50'}`}
          onClick={() => {
            onFailure(!row.toFailure);
          }}
        >
          <Flame aria-hidden size={20} fill={row.toFailure ? 'currentColor' : 'none'} />
        </button>

        {editMode ? (
          <button
            type="button"
            aria-label={`Remover série ${n}`}
            className={`${iconBtn} text-danger`}
            onClick={onRemove}
          >
            <Trash2 aria-hidden size={20} />
          </button>
        ) : row.confirmed ? (
          <span className={`flex size-11 items-center justify-center ${accentText}`}>
            <Check aria-hidden size={24} strokeWidth={3} />
            <span className="sr-only">Série {n} registrada</span>
          </span>
        ) : (
          <button
            type="button"
            aria-label={`Confirmar série ${n}`}
            className={`${iconBtn} border border-border bg-bg text-text hover:bg-surface-2`}
            onClick={onConfirm}
          >
            <Check aria-hidden size={22} />
          </button>
        )}
      </div>

      {isActive && dropKg !== undefined && !editMode && (
        <div className="mt-1 pl-7">
          <button
            type="button"
            className="flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm text-muted hover:text-text"
            onClick={onDrop}
          >
            <ArrowDown aria-hidden size={16} />
            Reduzir {formatNumber(dropKg)} kg nesta e nas próximas
          </button>
        </div>
      )}

      {askRpe && !editMode && (
        <div
          className="mt-1 flex items-center gap-1 pl-7"
          role="group"
          aria-label={`Como foi a série ${n}?`}
        >
          {RPE_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              aria-pressed={row.rpeNote === o.value}
              className={`min-h-11 rounded-full px-3 text-xs ${
                row.rpeNote === o.value ? 'bg-text text-bg' : 'text-muted hover:text-text'
              }`}
              onClick={() => {
                onRpe(row.rpeNote === o.value ? undefined : o.value);
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </li>
  );
}
