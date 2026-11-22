import { Outlet, useLocation } from 'react-router';
import { BottomNav } from './BottomNav';

/** Coluna central (máx. 480px) + barra inferior. A sessão ativa esconde a barra. */
export function AppLayout() {
  const { pathname } = useLocation();
  const showNav = !pathname.startsWith('/sessao/');

  return (
    <div className="mx-auto flex min-h-full max-w-[480px] flex-col">
      <main className={`flex-1 px-4 pt-4 ${showNav ? 'pb-24' : 'pb-6'}`}>
        <Outlet />
      </main>
      {showNav && <BottomNav />}
    </div>
  );
}
