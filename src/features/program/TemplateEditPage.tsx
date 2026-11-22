import { useParams } from 'react-router';
import { PageHeader } from '@/components/PageHeader';
import { Placeholder } from '@/components/Placeholder';

export function TemplateEditPage() {
  const { letter } = useParams();
  return (
    <>
      <PageHeader title={`Treino ${letter?.toUpperCase() ?? ''}`} backTo="/programa" />
      <Placeholder phase={6} />
    </>
  );
}
