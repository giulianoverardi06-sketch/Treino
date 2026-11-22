import { useParams } from 'react-router';
import { PageHeader } from '@/components/PageHeader';
import { Placeholder } from '@/components/Placeholder';

export function ExerciseDetailPage() {
  const { id } = useParams();
  return (
    <>
      <PageHeader title="Exercício" backTo="/progresso" />
      <Placeholder phase={5}>
        <p className="mt-1 break-all">Exercício {id}</p>
      </Placeholder>
    </>
  );
}
