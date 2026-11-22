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
});

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

/** Sessão concluída em `day` (YYYY-MM-DD, 18h local), com séries no primeiro exercício. */
async function done(letter: Letter, day: string, weights: number[] = [40, 40]) {
  const id = await startSession(letter);
  const session = await db.sessions.get(id);
  const entry = session?.entries[0];
  if (!entry) throw new Error('seed');
  for (const [i, w] of weights.entries()) {
    await confirmSet({
      sessionId: id,
      entryId: entry.id,
      exerciseId: entry.exerciseId,
      setIndex: i + 1,
      weightKg: w,
      reps: 10,
      toFailure: true,
    });
  }
  const start = new Date(`${day}T18:00:00`);
  await db.sessions.update(id, {
    status: 'concluida',
    startedAt: start.toISOString(),
    finishedAt: new Date(start.getTime() + 52 * 60_000).toISOString(),
  });
  return id;
}

describe('Histórico', () => {
  it('estado vazio', async () => {
    renderAt('/historico');
    expect(await screen.findByText('Nenhum treino concluído ainda.')).toBeInTheDocument();
  });

  it('lista em ordem cronológica reversa, agrupada por mês, sem em andamento', async () => {
    await done('A', '2026-02-27');
    await done('B', '2026-03-02');
    await done('C', '2026-03-04', [100]);
    await startSession('A'); // em andamento: não aparece
    renderAt('/historico');

    const march = await screen.findByRole('region', { name: 'março de 2026' });
    const links = within(march).getAllByRole('link');
    expect(links.map((l) => l.textContent.charAt(0))).toEqual(['C', 'B']);
    expect(links[0]).toHaveTextContent('1 exercício · 1 série · 52 min');
    expect(screen.getByRole('region', { name: 'fevereiro de 2026' })).toBeInTheDocument();
  });

  it('filtra por letra', async () => {
    await done('A', '2026-03-01');
    await done('B', '2026-03-02');
    const router = renderAt('/historico');
    await screen.findByRole('region', { name: 'março de 2026' });
    await userEvent.click(screen.getByRole('radio', { name: 'B' }));

    expect(router.state.location.search).toBe('?letra=B');
    await waitFor(() => {
      expect(screen.getAllByRole('link', { name: /Costas e bíceps/ })).toHaveLength(1);
    });
    expect(screen.queryByRole('link', { name: /Peito, ombro e tríceps/ })).toBeNull();

    await userEvent.click(screen.getByRole('radio', { name: 'C' }));
    expect(await screen.findByText('Nenhum treino C concluído ainda.')).toBeInTheDocument();
  });
});

describe('Detalhe da sessão', () => {
  it('mostra exercícios e séries e permite corrigir carga e reps', async () => {
    const id = await done('A', '2026-03-05', [40, 42.5]);
    renderAt(`/historico/${id}`);

    const weight = await screen.findByLabelText(
      'Carga da série 2 de Supino inclinado na máquina (kg)',
    );
    expect(weight).toHaveValue('42,5');
    expect(screen.getAllByText('não feito').length).toBeGreaterThan(0);

    await userEvent.clear(weight);
    await userEvent.type(weight, '45{Enter}');
    const reps = screen.getByLabelText('Repetições da série 1 de Supino inclinado na máquina');
    await userEvent.clear(reps);
    await userEvent.tab();

    await waitFor(async () => {
      const logs = await db.setLogs.where('sessionId').equals(id).sortBy('setIndex');
      expect(logs[1]?.weightKg).toBe(45);
      expect(logs[0]?.reps).toBeUndefined();
    });
  });

  it('excluir pede confirmação e apaga sessão e séries', async () => {
    const id = await done('A', '2026-03-05');
    const router = renderAt(`/historico/${id}`);
    await userEvent.click(await screen.findByRole('button', { name: 'Excluir sessão' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Excluir sessão?' }));
    expect(dialog.getByText(/2 séries serão apagados definitivamente/)).toBeInTheDocument();
    await userEvent.click(dialog.getByRole('button', { name: 'Excluir' }));

    await waitFor(async () => {
      expect(await db.sessions.get(id)).toBeUndefined();
    });
    expect(await db.setLogs.where('sessionId').equals(id).count()).toBe(0);
    expect(router.state.location.pathname).toBe('/historico');
  });

  it('sessão em andamento redireciona para a tela da sessão', async () => {
    const id = await startSession('B');
    const router = renderAt(`/historico/${id}`);
    await waitFor(() => {
      expect(router.state.location.pathname).toBe(`/sessao/${id}`);
    });
  });
});
