import { useParams } from 'react-router';
import { PageHeader } from '@/components/PageHeader';
import { Placeholder } from '@/components/Placeholder';

export function SessionPage() {
  const { id } = useParams();
  return (
    <>
      <PageHeader title="Sessão" backTo="/" />
      <Placeholder phase={2}>
        <p className="mt-1 break-all">Sessão {id}</p>
      </Placeholder>
    </>
  );
}
