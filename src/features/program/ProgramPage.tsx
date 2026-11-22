import { Link } from 'react-router';
import { PageHeader } from '@/components/PageHeader';
import { ProgramTabs } from '@/components/ProgramTabs';

const letters = [
  { letter: 'A', accent: 'border-l-letter-a' },
  { letter: 'B', accent: 'border-l-letter-b' },
  { letter: 'C', accent: 'border-l-letter-c' },
] as const;

export function ProgramPage() {
  return (
    <>
      <PageHeader title="Programa" />
      <ProgramTabs />
      <ul className="flex flex-col gap-2">
        {letters.map(({ letter, accent }) => (
          <li key={letter}>
            <Link
              to={`/programa/${letter}`}
              className={`flex min-h-14 items-center rounded-xl border-l-4 bg-surface px-4 text-lg font-semibold ${accent}`}
            >
              Treino {letter}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
