import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { routes } from '@/app/routes';
import { db } from '@/db/db';
import { confirmSet, startSession } from '@/db/sessionRepo';
import type { Letter } from '@/domain/types';

beforeEach(async () => {
  await db.sessions.clear();
  await db.setLogs.clear();
  await db.settings.update('singleton', (s) => {
    delete s.lastBackupAt;
  });
});

function renderHome() {
  const router = createMemoryRouter(routes, { initialEntries: ['/'] });
  render(<RouterProvider router={router} />);
  return router;
}

const HOUR = 3_600_000;

/** Sessão concluída que terminou `hoursAgo` horas atrás, com uma série de cada exercício. */
async function doneSession(letter: Letter, hoursAgo: number, exerciseIds: string[] = []) {
  const id = await startSession(letter);
  const end = Date.now() - hoursAgo * HOUR;
  for (const [i, exerciseId] of exerciseIds.entries()) {
    await confirmSet({
      sessionId: id,
      entryId: `e-${i}`,
      exerciseId,
      setIndex: 1,
      weightKg: 20,
      toFailure: true,
    });
  }
  await db.sessions.update(id, {
    status: 'concluida',
    startedAt: new Date(end - HOUR).toISOString(),
    finishedAt: new Date(end).toISOString(),
  });
  return id;
}

const nextCard = () => screen.getByRole('region', { name: 'Próximo treino' });

describe('Início', () => {
  it('sem sessões sugere A, sem lembrete de backup', async () => {
    renderHome();
    expect(
      await screen.findByRole('heading', { name: /Treino A: Peito, ombro e tríceps/ }),
    ).toBeInTheDocument();
    expect(within(nextCard()).getByText(/ainda não feito/)).toBeInTheDocument();
    expect(screen.queryByText(/backup/i)).toBeNull();
  });

  it('sugere a próxima letra da sequência real e mostra dias desde a última', async () => {
    await doneSession('A', 24 * 5);
    await doneSession('B', 24 * 3);
    renderHome();
    expect(
      await screen.findByRole('heading', { name: /Treino C: Pernas e core/ }),
    ).toBeInTheDocument();
    expect(within(nextCard()).getByText(/ainda não feito/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Peito, ombro e tríceps/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Costas e bíceps/ })).toBeInTheDocument();
  });

  it('aviso de sobreposição para grupo primário feito nas últimas 24h', async () => {
    // Treino A ontem com rosca direta adicionada → B sugerido tem bíceps primário.
    await doneSession('A', 10, ['supino-inclinado-maquina', 'rosca-direta-polia']);
    renderHome();
    await screen.findByRole('heading', { name: /Treino B/ });
    expect(screen.getByText(/Bíceps trabalhado (hoje|ontem)/)).toBeInTheDocument();
  });

  it('sem aviso quando só coincide grupo secundário', async () => {
    // Pulley (dorsais primário, bíceps secundário) num A avulso → B: dorsais é primário de B!
    // Então usamos supino (tríceps secundário) antes de um C: nada em comum.
    await doneSession('B', 30); // fora da janela, só para a sequência sugerir C
    await doneSession('B', 5, ['supino-inclinado-maquina']);
    renderHome();
    await screen.findByRole('heading', { name: /Treino C/ });
    expect(screen.queryByText(/trabalhad/)).toBeNull();
  });

  it('iniciar pela sugestão abre a sessão', async () => {
    const router = renderHome();
    await userEvent.click(await screen.findByRole('button', { name: 'Iniciar treino A' }));
    await waitFor(() => {
      expect(router.state.location.pathname).toMatch(/^\/sessao\//);
    });
  });

  it('sessão em andamento substitui a sugestão por "Continuar sessão"', async () => {
    const id = await startSession('B');
    renderHome();
    const link = await screen.findByRole('link', { name: 'Continuar sessão' });
    expect(link).toHaveAttribute('href', `/sessao/${id}`);
    expect(screen.queryByRole('region', { name: 'Próximo treino' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Iniciar treino/ })).toBeNull();
  });

  it('resumo de 7/30 dias e lembrete de backup', async () => {
    await doneSession('A', 24 * 2);
    await doneSession('B', 24 * 20);
    renderHome();
    const summary = within(await screen.findByRole('region', { name: 'Resumo' }));
    expect(summary.getByText('Últimos 7 dias').nextSibling).toHaveTextContent('1 sessão');
    expect(summary.getByText('Últimos 30 dias').nextSibling).toHaveTextContent('2 sessões');
    expect(summary.getByText('Última C').nextSibling).toHaveTextContent('—');
    expect(screen.getByText(/ainda não fez backup/)).toBeInTheDocument();
  });
});
