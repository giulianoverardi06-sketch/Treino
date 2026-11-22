import { useState } from 'react';
import { parseReps, parseWeight } from '@/domain/sessionRows';
import { formatNumber } from '@/lib/format';

/*
 * Campos numéricos de série. O texto é local enquanto se digita e só é gravado no blur/Enter.
 * Use `key={valor}` no pai para reiniciar o campo quando o valor mudar por fora.
 */

export function WeightInput({
  value,
  label,
  onCommit,
  className = 'h-12 text-[1.75rem] font-bold',
}: {
  value: number;
  label: string;
  onCommit: (kg: number) => void;
  className?: string;
}) {
  const [text, setText] = useState(formatNumber(value));
  const commit = () => {
    const parsed = parseWeight(text);
    if (parsed === undefined || parsed === value) setText(formatNumber(value));
    else onCommit(parsed);
  };
  return (
    <input
      type="text"
      inputMode="decimal"
      aria-label={label}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
      }}
      onFocus={(e) => {
        e.target.select();
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
      }}
      className={`w-full min-w-0 rounded-[3px] border-2 border-transparent bg-transparent text-center text-current num hover:border-current/25 focus:border-current/40 ${className}`}
    />
  );
}

export function RepsInput({
  value,
  placeholder,
  label,
  onCommit,
}: {
  value: number | undefined;
  placeholder: string;
  label: string;
  onCommit: (reps: number | undefined) => void;
}) {
  const [text, setText] = useState(value === undefined ? '' : String(value));
  const commit = () => {
    const parsed = parseReps(text);
    if (text.trim() !== '' && parsed === undefined) {
      setText(value === undefined ? '' : String(value));
    } else if (parsed !== value) {
      onCommit(parsed);
    }
  };
  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      aria-label={label}
      placeholder={placeholder}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
      }}
      className="h-12 w-full min-w-0 rounded-[3px] border-2 border-current/25 bg-transparent text-center text-lg font-semibold text-current num placeholder:text-current/45 focus:border-current/60"
    />
  );
}
