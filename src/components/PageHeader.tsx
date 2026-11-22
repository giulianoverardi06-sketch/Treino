import { ChevronLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';

interface PageHeaderProps {
  title: string;
  /** Rota do botão "voltar". Sem valor, não mostra o botão. */
  backTo?: string;
  /**
   * Volta para a tela anterior do histórico de navegação (quando a tela abre de vários lugares);
   * `backTo` vira o destino quando a página foi aberta direto.
   */
  historyBack?: boolean;
  /** Ações à direita (ex.: ícone de configurações). */
  actions?: ReactNode;
}

const backCls =
  '-ml-2 flex size-11 shrink-0 items-center justify-center rounded-full text-muted hover:text-text';

export function PageHeader({ title, backTo, historyBack = false, actions }: PageHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const canGoBack = historyBack && location.key !== 'default';

  return (
    <header className="mb-4 flex min-h-11 items-center gap-2">
      {backTo !== undefined &&
        (canGoBack ? (
          <button
            type="button"
            aria-label="Voltar"
            className={backCls}
            onClick={() => void navigate(-1)}
          >
            <ChevronLeft aria-hidden size={24} />
          </button>
        ) : (
          <Link to={backTo} aria-label="Voltar" className={backCls}>
            <ChevronLeft aria-hidden size={24} />
          </Link>
        ))}
      <h1 className="flex-1 truncate text-xl font-semibold">{title}</h1>
      {actions}
    </header>
  );
}
