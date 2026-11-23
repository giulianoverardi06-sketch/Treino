import { Navigate, type RouteObject } from 'react-router';
import { HistoryPage } from '@/features/history/HistoryPage';
import { SessionDetailPage } from '@/features/history/SessionDetailPage';
import { HomePage } from '@/features/home/HomePage';
import { SessionPage } from '@/features/session/SessionPage';
import { AppLayout } from './AppLayout';

/*
 * Rotas do SPEC §6. Exportadas para os testes usarem um memory router.
 *
 * Início, sessão e histórico ficam no pacote principal (abrem na hora, inclusive offline).
 * Gráficos (Recharts), edição do programa (dnd-kit) e configurações (zod) carregam sob demanda;
 * o service worker já guarda esses pedaços, então continuam funcionando offline.
 */
export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    hydrateFallbackElement: null,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'sessao/:id', element: <SessionPage /> },
      { path: 'historico', element: <HistoryPage /> },
      { path: 'historico/:id', element: <SessionDetailPage /> },
      {
        path: 'progresso',
        lazy: async () => ({
          Component: (await import('@/features/progress/ProgressPage')).ProgressPage,
        }),
      },
      {
        path: 'exercicio/:id',
        lazy: async () => ({
          Component: (await import('@/features/progress/ExerciseDetailPage')).ExerciseDetailPage,
        }),
      },
      {
        path: 'programa',
        lazy: async () => ({
          Component: (await import('@/features/program/ProgramPage')).ProgramPage,
        }),
      },
      {
        path: 'programa/:letter',
        lazy: async () => ({
          Component: (await import('@/features/program/TemplateEditPage')).TemplateEditPage,
        }),
      },
      {
        path: 'biblioteca',
        lazy: async () => ({
          Component: (await import('@/features/library/LibraryPage')).LibraryPage,
        }),
      },
      {
        path: 'biblioteca/novo',
        lazy: async () => ({
          Component: (await import('@/features/library/ExerciseEditPage')).ExerciseEditPage,
        }),
      },
      {
        path: 'biblioteca/:id',
        lazy: async () => ({
          Component: (await import('@/features/library/ExerciseEditPage')).ExerciseEditPage,
        }),
      },
      {
        path: 'cardio/novo',
        lazy: async () => ({
          Component: (await import('@/features/cardio/CardioEditPage')).CardioEditPage,
        }),
      },
      {
        path: 'cardio/:id',
        lazy: async () => ({
          Component: (await import('@/features/cardio/CardioEditPage')).CardioEditPage,
        }),
      },
      {
        path: 'config',
        lazy: async () => ({
          Component: (await import('@/features/settings/SettingsPage')).SettingsPage,
        }),
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
];
