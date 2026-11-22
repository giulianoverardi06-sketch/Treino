import { Settings } from 'lucide-react';
import { Link } from 'react-router';
import { PageHeader } from '@/components/PageHeader';
import { Placeholder } from '@/components/Placeholder';

export function HomePage() {
  return (
    <>
      <PageHeader
        title="Treino ABC"
        actions={
          <Link
            to="/config"
            aria-label="Configurações"
            className="-mr-2 flex size-11 items-center justify-center rounded-full text-muted hover:text-text"
          >
            <Settings aria-hidden size={22} />
          </Link>
        }
      />
      <div className="mb-4 flex gap-2" aria-hidden>
        <span className="h-1.5 flex-1 rounded-full bg-letter-a" />
        <span className="h-1.5 flex-1 rounded-full bg-letter-b" />
        <span className="h-1.5 flex-1 rounded-full bg-letter-c" />
      </div>
      <Placeholder phase={3}>
        <p className="mt-1">Próximo treino, aviso de sobreposição e “continuar sessão”.</p>
      </Placeholder>
    </>
  );
}
