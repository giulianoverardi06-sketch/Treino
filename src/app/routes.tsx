import { Navigate, type RouteObject } from 'react-router';
import { HistoryPage } from '@/features/history/HistoryPage';
import { SessionDetailPage } from '@/features/history/SessionDetailPage';
import { HomePage } from '@/features/home/HomePage';
import { ExerciseEditPage } from '@/features/library/ExerciseEditPage';
import { LibraryPage } from '@/features/library/LibraryPage';
import { ExerciseDetailPage } from '@/features/progress/ExerciseDetailPage';
import { ProgressPage } from '@/features/progress/ProgressPage';
import { ProgramPage } from '@/features/program/ProgramPage';
import { TemplateEditPage } from '@/features/program/TemplateEditPage';
import { SessionPage } from '@/features/session/SessionPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { AppLayout } from './AppLayout';

/** Rotas do SPEC §6. Exportadas para os testes usarem um memory router. */
export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'sessao/:id', element: <SessionPage /> },
      { path: 'historico', element: <HistoryPage /> },
      { path: 'historico/:id', element: <SessionDetailPage /> },
      { path: 'progresso', element: <ProgressPage /> },
      { path: 'exercicio/:id', element: <ExerciseDetailPage /> },
      { path: 'programa', element: <ProgramPage /> },
      { path: 'programa/:letter', element: <TemplateEditPage /> },
      { path: 'biblioteca', element: <LibraryPage /> },
      { path: 'biblioteca/novo', element: <ExerciseEditPage /> },
      { path: 'biblioteca/:id', element: <ExerciseEditPage /> },
      { path: 'config', element: <SettingsPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
];
