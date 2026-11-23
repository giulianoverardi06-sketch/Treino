import { ChevronDown } from 'lucide-react';
import type { SelectHTMLAttributes } from 'react';

/** Select nativo com a seta desenhada (o `appearance-none` tira a seta do navegador). */
export function Select({
  className = '',
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className="relative block">
      <select
        className={`h-12 w-full appearance-none rounded-[3px] border-2 border-edge bg-surface pr-10 pl-3 text-base text-text ${className}`}
        {...rest}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        size={20}
        strokeWidth={2.5}
        className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted"
      />
    </span>
  );
}
