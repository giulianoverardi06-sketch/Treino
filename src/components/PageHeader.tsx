import { ChevronLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

interface PageHeaderProps {
  title: string;
  /** Rota do botão "voltar". Sem valor, não mostra o botão. */
  backTo?: string;
  /** Ações à direita (ex.: ícone de configurações). */
  actions?: ReactNode;
}

export function PageHeader({ title, backTo, actions }: PageHeaderProps) {
  return (
    <header className="mb-4 flex min-h-11 items-center gap-2">
      {backTo !== undefined && (
        <Link
          to={backTo}
          aria-label="Voltar"
          className="-ml-2 flex size-11 items-center justify-center rounded-full text-muted hover:text-text"
        >
          <ChevronLeft aria-hidden size={24} />
        </Link>
      )}
      <h1 className="flex-1 truncate text-xl font-semibold">{title}</h1>
      {actions}
    </header>
  );
}
