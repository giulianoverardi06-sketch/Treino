import { Construction } from 'lucide-react';
import type { ReactNode } from 'react';
import { Tile } from './Sign';

/** Bloco provisório para telas ainda não implementadas. */
export function Placeholder({ phase, children }: { phase: number; children?: ReactNode }) {
  return (
    <div className="flex items-start gap-3 border-y border-border py-4 text-base text-muted">
      <Tile icon={Construction} />
      <div className="pt-2">
        <p className="font-semibold text-text">Em construção, Fase {phase}</p>
        {children}
      </div>
    </div>
  );
}
