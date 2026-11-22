import { PageHeader } from '@/components/PageHeader';
import { Placeholder } from '@/components/Placeholder';

export function SettingsPage() {
  return (
    <>
      <PageHeader title="Configurações" backTo="/" />
      <Placeholder phase={8} />
      <footer className="mt-8 text-center text-xs text-muted">
        <p>Imagens: free-exercise-db (domínio público)</p>
      </footer>
    </>
  );
}
