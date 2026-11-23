import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { routes } from '@/app/routes';
import { db } from '@/db/db';
import { confirmSet, finishSession, startSession } from '@/db/sessionRepo';
import { useDraftStore } from './draftStore';

beforeEach(async () => {
  await db.sessions.clear();
  await db.setLogs.clear();
  useDraftStore.setState({ drafts: {} });
});

/** Sessão A anterior já concluída: supino 4×40 kg e lateral 8 kg. */
async function previousSessionA() {
  const id = await startSession('A');
  const s = await db.sessions.get(id);
  const [supino, lateral] = s?.entries ?? [];
  if (!supino || !lateral) throw new Error('seed');
  for (const i of [1, 2, 3, 4]) {
    await confirmSet({
      sessionId: id,
      entryId: supino.id,
      exerciseId: supino.exerciseId,
      setIndex: i,
      weightKg: 40,
      toFailure: true,
    });
  }
  await finishSession(id);
  // Garante que a próxima sessão começa depois desta.
  await db.sessions.update(id, { startedAt: '2026-01-01T10:00:00.000Z' });
}

async function openSession(letter: 'A' | 'B' = 'A') {
  const id = await startSession(letter);
  const router = createMemoryRouter(routes, { initialEntries: [`/sessao/${id}`] });
  const view = render(<RouterProvider router={router} />);
  await screen.findByRole('heading', { name: `Treino ${letter}` });
  return { id, router, view };
}

const logs = (sessionId: string) => db.setLogs.where('sessionId').equals(sessionId).toArray();

describe('sessão ativa', () => {
  it('registra uma série com um toque usando a carga da última sessão', async () => {
    await previousSessionA();
    const { id } = await openSession();

    const weight = await screen.findByLabelText('Carga da série 1 (kg)');
    expect(weight).toHaveValue('40');
    expect(screen.getByText(/Última: 4×40 kg, falha/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Confirmar série 1' }));
    await waitFor(async () => {
      expect(await logs(id)).toHaveLength(1);
    });
    const [log] = await logs(id);
    expect(log).toMatchObject({ weightKg: 40, toFailure: true, setIndex: 1 });
    expect(log?.reps).toBeUndefined();
    expect(await screen.findByText('Série 1 registrada')).toBeInTheDocument();
  });

  it('séries registradas continuam lá ao reabrir a tela', async () => {
    const { id, view } = await openSession();
    await userEvent.click(await screen.findByRole('button', { name: 'Confirmar série 1' }));
    await waitFor(async () => {
      expect(await logs(id)).toHaveLength(1);
    });
    view.unmount();

    const router = createMemoryRouter(routes, { initialEntries: [`/sessao/${id}`] });
    render(<RouterProvider router={router} />);
    expect(await screen.findByText('Série 1 registrada')).toBeInTheDocument();
    expect(screen.getByText('1/4')).toBeInTheDocument();
  });

  it('stepper usa o incremento do exercício e reps são opcionais', async () => {
    const { id } = await openSession();
    await userEvent.click(await screen.findByRole('button', { name: 'Aumentar carga da série 1' }));
    expect(screen.getByLabelText('Carga da série 1 (kg)')).toHaveValue('2,5');
    await userEvent.type(screen.getByLabelText('Repetições da série 1 (opcional)'), '12');
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar série 1' }));
    await waitFor(async () => {
      expect((await logs(id))[0]).toMatchObject({ weightKg: 2.5, reps: 12 });
    });
  });

  it('trocar por alternativa vale só para a sessão', async () => {
    const template = await db.templates.get('tpl-A');
    const { id } = await openSession();
    await userEvent.click(
      await screen.findByRole('radio', { name: 'Supino inclinado com halteres' }),
    );
    await waitFor(async () => {
      expect((await db.sessions.get(id))?.entries[0]?.exerciseId).toBe('supino-inclinado-halteres');
    });
    expect(await db.templates.get('tpl-A')).toEqual(template);
  });

  it('protocolo lateral: "↓ reduzir" aplica −2 kg nesta e nas próximas', async () => {
    await openSession();
    await userEvent.click(screen.getByRole('button', { name: /Elevação lateral com halteres/ }));
    const series = within(await screen.findByRole('list', { name: 'Séries' }));
    expect(series.getByLabelText('Carga da série 1 (kg)')).toHaveValue('8');

    await userEvent.click(series.getByRole('button', { name: /Reduzir 2 kg/ }));
    expect(series.getByLabelText('Carga da série 1 (kg)')).toHaveValue('6');
    expect(series.getByLabelText('Carga da série 8 (kg)')).toHaveValue('6');
  });

  it('remove série com desfazer', async () => {
    const { id } = await openSession();
    await userEvent.click(await screen.findByRole('button', { name: 'Confirmar série 1' }));
    await screen.findByText('Série 1 registrada');
    await userEvent.click(screen.getByRole('button', { name: 'Editar séries' }));
    await userEvent.click(screen.getByRole('button', { name: 'Remover série 1' }));
    await waitFor(async () => {
      expect(await logs(id)).toHaveLength(0);
    });
    // O cabeçalho do card (aria-expanded), não o botão da foto, que também cita o exercício.
    const header = () => {
      const button = screen
        .getAllByRole('button', { name: /Supino inclinado na máquina/ })
        .find((b) => b.hasAttribute('aria-expanded'));
      if (!button) throw new Error('cabeçalho do card não encontrado');
      return button;
    };
    expect(await within(header()).findByText('0/3')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Desfazer' }));
    await waitFor(async () => {
      expect(await logs(id)).toHaveLength(1);
    });
    expect(await within(header()).findByText('1/4')).toBeInTheDocument();
  });

  it('slot opcional pode ser pulado com um toque', async () => {
    const { id } = await openSession('B');
    const card = screen.getByRole('button', { name: /Remada apoiada com pegada aberta/ });
    const pular = within(card.parentElement as HTMLElement).getByRole('button', { name: 'Pular' });
    await userEvent.click(pular);
    await waitFor(async () => {
      expect((await db.sessions.get(id))?.entries[2]?.skipped).toBe(true);
    });
  });

  it('finalizar mostra o resumo e conclui', async () => {
    const { id, router } = await openSession();
    await userEvent.click(await screen.findByRole('button', { name: 'Confirmar série 1' }));
    await screen.findByText('Série 1 registrada');
    await userEvent.click(screen.getByRole('button', { name: 'Finalizar treino' }));

    const dialog = within(screen.getByRole('dialog', { name: 'Finalizar treino' }));
    expect(dialog.getByText('Séries').nextSibling).toHaveTextContent('1');
    await userEvent.type(dialog.getByLabelText('Observação (opcional)'), 'ok');
    await userEvent.click(dialog.getByRole('button', { name: 'Concluir treino' }));

    await waitFor(async () => {
      expect(await db.sessions.get(id)).toMatchObject({ status: 'concluida', notes: 'ok' });
    });
    expect(router.state.location.pathname).toBe('/');
  });

  it('descartar pede confirmação', async () => {
    const { id } = await openSession();
    await userEvent.click(screen.getByRole('button', { name: 'Descartar sessão' }));
    await userEvent.click(
      within(screen.getByRole('dialog', { name: 'Descartar sessão?' })).getByRole('button', {
        name: 'Descartar',
      }),
    );
    await waitFor(async () => {
      expect((await db.sessions.get(id))?.status).toBe('descartada');
    });
  });

  it('+ Exercício adiciona da biblioteca', async () => {
    const { id } = await openSession();
    await userEvent.click(screen.getByRole('button', { name: 'Exercício' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Adicionar exercício' }));
    await userEvent.type(dialog.getByRole('searchbox'), 'face');
    await act(async () => {
      await userEvent.click(dialog.getByRole('button', { name: /Face pull/ }));
    });
    await waitFor(async () => {
      expect((await db.sessions.get(id))?.entries.at(-1)?.exerciseId).toBe('face-pull');
    });
  });
});
