import { useParams } from 'react-router';
import { PageHeader } from '@/components/PageHeader';
import { Placeholder } from '@/components/Placeholder';

export function SessionDetailPage() {
  const { id } = useParams();
  return (
    <>
      <PageHeader title="Detalhe da sessão" backTo="/historico" />
      <Placeholder phase={4}>
        <p className="mt-1 break-all">Sessão {id}</p>
      </Placeholder>
    </>
  );
}
