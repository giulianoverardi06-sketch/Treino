import { NavLink } from 'react-router';

/** Subabas da aba Programa: Treinos (A/B/C) e Biblioteca. */
export function ProgramTabs() {
  const cls = ({ isActive }: { isActive: boolean }) =>
    `flex min-h-11 flex-1 items-center justify-center rounded-[2px] text-[0.9375rem] font-semibold transition-colors ${
      isActive ? 'bg-text text-bg' : 'text-muted hover:text-text'
    }`;

  return (
    <nav
      aria-label="Seções do programa"
      className="mb-5 flex rounded-[4px] border-2 border-edge p-0.5"
    >
      <NavLink to="/programa" end className={cls}>
        Treinos
      </NavLink>
      <NavLink to="/biblioteca" end className={cls}>
        Biblioteca
      </NavLink>
    </nav>
  );
}
