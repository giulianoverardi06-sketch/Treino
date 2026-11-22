import { ChartLine, Dumbbell, History, House, type LucideIcon } from 'lucide-react';
// Link (e não NavLink): o estado ativo é calculado aqui para cobrir rotas irmãs
// (/biblioteca acende Programa); NavLink sobrescreveria o aria-current.
import { Link, useLocation } from 'react-router';

interface Tab {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Outros prefixos de rota que também acendem a aba. */
  alsoActive?: string[];
}

const tabs: Tab[] = [
  { to: '/', label: 'Início', icon: House, alsoActive: ['/config'] },
  { to: '/historico', label: 'Histórico', icon: History },
  { to: '/progresso', label: 'Progresso', icon: ChartLine, alsoActive: ['/exercicio'] },
  { to: '/programa', label: 'Programa', icon: Dumbbell, alsoActive: ['/biblioteca'] },
];

function isTabActive(tab: Tab, pathname: string): boolean {
  const matches = (p: string) => pathname === p || pathname.startsWith(`${p}/`);
  // "/" casa com tudo por prefixo, então a aba Início só acende na rota exata.
  const self = tab.to === '/' ? pathname === '/' : matches(tab.to);
  return self || (tab.alsoActive ?? []).some(matches);
}

export function BottomNav() {
  const { pathname } = useLocation();

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto grid max-w-[480px] grid-cols-4">
        {tabs.map((tab) => {
          const active = isTabActive(tab, pathname);
          const Icon = tab.icon;
          return (
            <li key={tab.to}>
              <Link
                to={tab.to}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs transition-colors ${
                  active ? 'text-text' : 'text-muted hover:text-text'
                }`}
              >
                <Icon aria-hidden size={22} strokeWidth={active ? 2.4 : 1.8} />
                <span className={active ? 'font-semibold' : undefined}>{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
