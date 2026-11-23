import type { Letter } from '@/domain/types';
import { LETTER_STYLES } from './letterStyles';

interface LetterFilterProps<T extends string> {
  value: Letter | T | undefined;
  onChange: (value: Letter | T | undefined) => void;
  label: string;
  /** Letras a mostrar, em ordem. */
  letters: readonly Letter[];
  /** Opções extras depois das letras (ex.: "Cardio"). */
  extras?: readonly { value: T; label: string }[];
}

/** "Todos · A · B · C…": o treino escolhido acende na própria cor de saguão. */
export function LetterFilter<T extends string = never>({
  value,
  onChange,
  label,
  letters,
  extras = [],
}: LetterFilterProps<T>) {
  const options: { value: Letter | T | undefined; label: string; on: string }[] = [
    { value: undefined, label: 'Todos', on: 'bg-text text-bg' },
    ...letters.map((l) => ({
      value: l,
      label: l,
      on: `${LETTER_STYLES[l].bg} ${LETTER_STYLES[l].onBg}`,
    })),
    ...extras.map((e) => ({ value: e.value, label: e.label, on: 'bg-text text-bg' })),
  ];
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value ?? 'todos'}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => {
              onChange(option.value);
            }}
            className={`min-h-11 min-w-11 rounded-[3px] border-2 px-3 text-base font-bold transition-colors ${
              selected
                ? `${option.on} border-transparent`
                : 'border-edge text-text hover:bg-surface-2'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
