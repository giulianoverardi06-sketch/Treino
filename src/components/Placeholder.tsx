import type { ReactNode } from 'react';

/** Bloco provisório para telas ainda não implementadas. */
export function Placeholder({ phase, children }: { phase: number; children?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface p-6 text-center text-sm text-muted">
      <p>Em construção — Fase {phase}.</p>
      {children}
    </div>
  );
}
