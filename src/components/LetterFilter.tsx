import { LETTERS, type Letter } from '@/domain/types';
import { LETTER_STYLES } from './letterStyles';

interface LetterFilterProps {
  value: Letter | undefined;
  onChange: (letter: Letter | undefined) => void;
  label: string;
}

/** Chips "Todos · A · B · C". */
export function LetterFilter({ value, onChange, label }: LetterFilterProps) {
  const options: (Letter | undefined)[] = [undefined, ...LETTERS];
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1.5">
      {options.map((letter) => {
        const selected = value === letter;
        const selectedCls = letter ? `${LETTER_STYLES[letter].bg} text-bg` : 'bg-text text-bg';
        return (
          <button
            key={letter ?? 'todos'}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => {
              onChange(letter);
            }}
            className={`min-h-11 min-w-11 rounded-full px-4 text-sm font-semibold transition-colors ${
              selected ? selectedCls : 'bg-surface text-muted hover:text-text'
            }`}
          >
            {letter ?? 'Todos'}
          </button>
        );
      })}
    </div>
  );
}
