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
}: {
  value: number;
  label: string;
  onCommit: (kg: number) => void;
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
      className="h-11 w-full min-w-0 rounded-lg bg-bg text-center text-lg font-semibold text-text num"
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
      className="h-11 w-full min-w-0 rounded-lg bg-bg text-center text-base text-text num placeholder:text-muted/60"
    />
  );
}
