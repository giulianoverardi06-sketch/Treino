import { useParams } from 'react-router';
import { PageHeader } from '@/components/PageHeader';
import { Placeholder } from '@/components/Placeholder';

export function ExerciseEditPage() {
  const { id } = useParams();
  return (
    <>
      <PageHeader title="Editar exercício" backTo="/biblioteca" />
      <Placeholder phase={6}>
        <p className="mt-1 break-all">Exercício {id}</p>
      </Placeholder>
    </>
  );
}
