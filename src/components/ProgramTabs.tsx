import { NavLink } from 'react-router';

/** Subabas da aba Programa: Templates (A/B/C) e Biblioteca. */
export function ProgramTabs() {
  const base =
    'flex min-h-11 flex-1 items-center justify-center rounded-lg text-sm font-medium transition-colors';
  const cls = ({ isActive }: { isActive: boolean }) =>
    `${base} ${isActive ? 'bg-surface-2 text-text' : 'text-muted hover:text-text'}`;

  return (
    <nav aria-label="Seções do programa" className="mb-4 flex gap-1 rounded-xl bg-surface p-1">
      <NavLink to="/programa" end className={cls}>
        Treinos
      </NavLink>
      <NavLink to="/biblioteca" end className={cls}>
        Biblioteca
      </NavLink>
    </nav>
  );
}
