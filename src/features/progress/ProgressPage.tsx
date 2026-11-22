import { PageHeader } from '@/components/PageHeader';
import { Placeholder } from '@/components/Placeholder';

export function ProgressPage() {
  return (
    <>
      <PageHeader title="Progresso" />
      <Placeholder phase={5} />
    </>
  );
}
