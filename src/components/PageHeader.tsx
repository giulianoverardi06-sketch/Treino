import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';

interface PageHeaderProps {
  title: string;
  /** Linha abaixo do título (ex.: nome do treino, data). */
  subtitle?: ReactNode;
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
  'flex size-11 shrink-0 items-center justify-center rounded-[3px] bg-tile text-on-tile hover:bg-black/80';

export function PageHeader({
  title,
  subtitle,
  backTo,
  historyBack = false,
  actions,
}: PageHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const canGoBack = historyBack && location.key !== 'default';
  const icon = <ArrowLeft aria-hidden size={24} strokeWidth={2.5} />;

  return (
    <header className="mb-5 flex items-start gap-3">
      {backTo !== undefined &&
        (canGoBack ? (
          <button
            type="button"
            aria-label="Voltar"
            className={backCls}
            onClick={() => void navigate(-1)}
          >
            {icon}
          </button>
        ) : (
          <Link to={backTo} aria-label="Voltar" className={backCls}>
            {icon}
          </Link>
        ))}
      <div className="min-w-0 flex-1 pt-0.5">
        <h1 className="text-[1.75rem] leading-[1.1] font-extrabold tracking-[-0.01em] text-balance">
          {title}
        </h1>
        {subtitle && <div className="mt-1 text-base text-muted">{subtitle}</div>}
      </div>
      {actions}
    </header>
  );
}
