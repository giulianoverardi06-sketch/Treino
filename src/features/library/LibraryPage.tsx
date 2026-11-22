import { PageHeader } from '@/components/PageHeader';
import { Placeholder } from '@/components/Placeholder';
import { ProgramTabs } from '@/components/ProgramTabs';

export function LibraryPage() {
  return (
    <>
      <PageHeader title="Programa" />
      <ProgramTabs />
      <Placeholder phase={6} />
    </>
  );
}
