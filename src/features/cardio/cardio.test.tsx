import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { routes } from '@/app/routes';
import { db } from '@/db/db';
import { saveCardio } from '@/db/cardioRepo';
import { cardioToDraft } from '@/domain/cardio';

beforeEach(async () => {
  await db.sessions.clear();
  await db.setLogs.clear();
  await db.cardio.clear();
});

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

/** Cardio de hoje, 30 min. */
async function addCardio(patch: Partial<ReturnType<typeof cardioToDraft>> = {}) {
  const today = cardioToDraft(undefined, new Date());
  return saveCardio({ ...today, time: '00:01', durationMin: '30', ...patch });
}

describe('Cardio avulso', () => {
  it('registra pelo Início, sem mudar o próximo treino', async () => {
    const router = renderAt('/');
    await userEvent.click(await screen.findByRole('link', { name: /Registrar cardio/ }));
    await userEvent.click(await screen.findByRole('radio', { name: 'Bicicleta' }));
    await userEvent.type(screen.getByLabelText('Duração (min)'), '40');
    await userEvent.type(screen.getByLabelText(/Distância/), '12,5');
    expect(screen.getByText(/Velocidade média/)).toHaveTextContent('18,8 km/h');
    await userEvent.click(screen.getByRole('radio', { name: 'Forte' }));
    await userEvent.click(screen.getByRole('button', { name: 'Registrar cardio' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/');
    });
    const [saved] = await db.cardio.toArray();
    expect(saved).toMatchObject({
      activity: 'bicicleta',
      durationMin: 40,
      distanceKm: 12.5,
      intensity: 'forte',
    });
    expect(await screen.findByText(/Últimos 7 dias: 40 min · 12,5 km · 1 sessão/)).toBeVisible();
    expect(screen.getByRole('region', { name: 'Próximo treino' })).toHaveTextContent('A');
  });

  it('pede a duração e o nome de "outro"', async () => {
    renderAt('/cardio/novo');
    await userEvent.click(await screen.findByRole('radio', { name: 'Outro' }));
    await userEvent.click(screen.getByRole('button', { name: 'Registrar cardio' }));
    expect(screen.getByText('Informe a duração.')).toBeVisible();
    expect(screen.getByText('Dê um nome à atividade.')).toBeVisible();
    expect(await db.cardio.count()).toBe(0);
  });

  it('aparece no histórico, filtra por "Cardio", edita e exclui', async () => {
    await addCardio({ activity: 'outro', activityName: 'Remo', distanceKm: '5' });
    renderAt('/historico');
    const row = await screen.findByRole('link', { name: /cardio: Remo, 5 km, 30 min/ });
    await userEvent.click(screen.getByRole('radio', { name: 'A' }));
    expect(screen.queryByRole('link', { name: /cardio: Remo/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: 'Cardio' }));
    expect(await screen.findByRole('link', { name: /cardio: Remo/ })).toBeVisible();
    expect(row).toBeTruthy();

    await userEvent.click(screen.getByRole('link', { name: /cardio: Remo/ }));
    const duration = await screen.findByLabelText('Duração (min)');
    await userEvent.clear(duration);
    await userEvent.type(duration, '35');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(async () => {
      expect((await db.cardio.toArray())[0]?.durationMin).toBe(35);
    });

    await userEvent.click(await screen.findByRole('link', { name: /cardio: Remo/ }));
    await userEvent.click(await screen.findByRole('button', { name: 'Excluir registro' }));
    const dialog = await screen.findByRole('dialog', { name: 'Excluir este cardio?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Excluir' }));
    await waitFor(async () => {
      expect(await db.cardio.count()).toBe(0);
    });
  });

  it('progresso mostra tempo e distância do período', async () => {
    await addCardio({ distanceKm: '4,5' });
    await addCardio({ durationMin: '20' });
    renderAt('/progresso');
    const section = await screen.findByRole('region', { name: 'Cardio' }, { timeout: 8000 });
    expect(section).toHaveTextContent('50 min');
    expect(section).toHaveTextContent('4,5 km');
    expect(section).toHaveTextContent('2');
  });
});
