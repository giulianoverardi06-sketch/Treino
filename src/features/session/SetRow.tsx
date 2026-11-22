import { ArrowDown, Check, Flame, Minus, Plus, Trash2 } from 'lucide-react';
import { RepsInput, WeightInput } from '@/components/SetInputs';
import { stepWeight, type SessionRow } from '@/domain/sessionRows';
import type { RpeNote } from '@/domain/types';
import { formatNumber } from '@/lib/format';

export interface SetRowProps {
  row: SessionRow;
  incrementKg: number;
  /** Modo edição da entrada: mostra a lixeira no lugar do ✓. */
  editMode: boolean;
  /** Primeira série não confirmada: a da vez (✓ amarelo, atalho do protocolo lateral). */
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
  'grid grid-cols-[1.5rem_minmax(0,1fr)_3.25rem_2.75rem_3rem] items-center gap-1.5';

const stepBtn =
  'flex h-12 w-11 shrink-0 items-center justify-center rounded-[3px] text-current/70 hover:bg-current/10 hover:text-current disabled:opacity-30';

const RPE_OPTIONS: { value: RpeNote; label: string }[] = [
  { value: 'facil', label: 'Fácil' },
  { value: 'ok', label: 'Ok' },
  { value: 'dificil', label: 'Difícil' },
];

export function SetRow({
  row,
  incrementKg,
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
  // Série registrada inverte a tinta (estado por inversão, não por ícone).
  const tone = row.confirmed ? 'bg-text text-bg' : isActive ? 'bg-surface-2' : '';

  return (
    <li className={`rounded-[3px] px-1.5 py-1 ${tone}`}>
      <div className={SET_GRID}>
        <span className="text-center text-lg font-bold num">{n}</span>

        <div className="flex items-center">
          <button
            type="button"
            aria-label={`Diminuir carga da série ${n}`}
            className={stepBtn}
            disabled={row.weightKg <= 0}
            onClick={() => {
              onWeight(stepWeight(row.weightKg, incrementKg, -1));
            }}
          >
            <Minus aria-hidden size={20} strokeWidth={2.5} />
          </button>
          <WeightInput
            key={row.weightKg}
            value={row.weightKg}
            label={`Carga da série ${n} (kg)`}
            onCommit={onWeight}
            className="h-12 text-[1.375rem] font-bold tracking-[-0.02em]"
          />
          <button
            type="button"
            aria-label={`Aumentar carga da série ${n}`}
            className={stepBtn}
            onClick={() => {
              onWeight(stepWeight(row.weightKg, incrementKg, 1));
            }}
          >
            <Plus aria-hidden size={20} strokeWidth={2.5} />
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
          className={`flex size-11 items-center justify-center rounded-[3px] ${
            row.toFailure ? 'text-current' : 'text-current/35'
          }`}
          onClick={() => {
            onFailure(!row.toFailure);
          }}
        >
          <Flame
            aria-hidden
            size={22}
            strokeWidth={2.25}
            fill={row.toFailure ? 'currentColor' : 'none'}
          />
        </button>

        {editMode ? (
          <button
            type="button"
            aria-label={`Remover série ${n}`}
            className="flex size-12 items-center justify-center rounded-[3px] border-2 border-current/40"
            onClick={onRemove}
          >
            <Trash2 aria-hidden size={20} />
          </button>
        ) : row.confirmed ? (
          <span className="flex size-12 items-center justify-center">
            <Check aria-hidden size={26} strokeWidth={3} />
            <span className="sr-only">Série {n} registrada</span>
          </span>
        ) : (
          <button
            type="button"
            aria-label={`Confirmar série ${n}`}
            className={`flex size-12 items-center justify-center rounded-[3px] ${
              isActive
                ? 'bg-sign text-on-sign'
                : 'border-2 border-current/30 text-current/70 hover:border-current/60'
            }`}
            onClick={onConfirm}
          >
            <Check aria-hidden size={24} strokeWidth={3} />
          </button>
        )}
      </div>

      {isActive && dropKg !== undefined && !editMode && (
        <button
          type="button"
          className="mt-1 ml-7 flex min-h-11 items-center gap-2 text-base font-semibold text-current/80 hover:text-current"
          onClick={onDrop}
        >
          <ArrowDown aria-hidden size={18} strokeWidth={2.5} />
          Reduzir {formatNumber(dropKg)} kg nesta e nas próximas
        </button>
      )}

      {askRpe && !editMode && (
        <div
          className="mt-1 ml-7 flex items-center gap-1"
          role="group"
          aria-label={`Como foi a série ${n}?`}
        >
          {RPE_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              aria-pressed={row.rpeNote === o.value}
              className={`min-h-11 rounded-[3px] px-3 text-sm font-semibold ${
                row.rpeNote === o.value
                  ? 'bg-current/20 text-current'
                  : 'text-current/65 hover:text-current'
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
