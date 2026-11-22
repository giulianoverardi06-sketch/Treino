import { LETTERS, type Letter } from '@/domain/types';
import { LETTER_STYLES } from './letterStyles';

interface LetterFilterProps {
  value: Letter | undefined;
  onChange: (letter: Letter | undefined) => void;
  label: string;
}

/** "Todos · A · B · C": o treino escolhido acende na própria cor de saguão. */
export function LetterFilter({ value, onChange, label }: LetterFilterProps) {
  const options: (Letter | undefined)[] = [undefined, ...LETTERS];
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-2">
      {options.map((letter) => {
        const selected = value === letter;
        const on = letter
          ? `${LETTER_STYLES[letter].bg} text-white border-transparent`
          : 'bg-text text-bg border-transparent';
        return (
          <button
            key={letter ?? 'todos'}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => {
              onChange(letter);
            }}
            className={`min-h-11 min-w-12 rounded-[3px] border-2 px-4 text-base font-bold transition-colors ${
              selected ? on : 'border-edge text-text hover:bg-surface-2'
            }`}
          >
            {letter ?? 'Todos'}
          </button>
        );
      })}
    </div>
  );
}
