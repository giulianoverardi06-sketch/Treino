import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { routes } from '@/app/routes';
import { buildSeed } from '@/data/seedProgram';
import { db } from '@/db/db';

beforeEach(async () => {
  const seed = buildSeed('2026-01-01T00:00:00.000Z');
  await db.transaction('rw', db.templates, db.exercises, db.setLogs, db.sessions, async () => {
    await db.templates.clear();
    await db.exercises.clear();
    await db.setLogs.clear();
    await db.sessions.clear();
    await db.templates.bulkAdd(seed.templates);
    await db.exercises.bulkAdd(seed.exercises);
  });
});

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

const slotIds = async () => (await db.templates.get('tpl-B'))?.slots.map((s) => s.label) ?? [];

describe('Editar treino', () => {
  it('nome salva ao sair do campo', async () => {
    renderAt('/programa/b');
    const name = await screen.findByLabelText('Nome');
    await userEvent.clear(name);
    await userEvent.type(name, 'Puxar');
    await userEvent.tab();
    await waitFor(async () => {
      expect((await db.templates.get('tpl-B'))?.name).toBe('Puxar');
    });
  });

  it('reordena com as setas', async () => {
    renderAt('/programa/b');
    await userEvent.click(await screen.findByRole('button', { name: 'Subir Remada horizontal' }));
    await waitFor(async () => {
      expect((await slotIds()).slice(0, 2)).toEqual(['Remada horizontal', 'Puxada vertical']);
    });
  });

  it('adiciona exercício da biblioteca no fim', async () => {
    renderAt('/programa/b');
    await userEvent.click(await screen.findByRole('button', { name: 'Exercício' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Adicionar ao treino' }));
    await userEvent.type(dialog.getByRole('searchbox'), 'face');
    await userEvent.click(dialog.getByRole('button', { name: /Face pull/ }));
    await waitFor(async () => {
      expect((await db.templates.get('tpl-B'))?.slots.at(-1)).toMatchObject({
        label: 'Face pull',
        primaryExerciseId: 'face-pull',
        plannedSets: 3,
      });
    });
  });

  it('edita slot: promove alternativa, muda séries e opcional', async () => {
    renderAt('/programa/b');
    await userEvent.click(
      await screen.findByRole('button', { name: 'Editar Puxada vertical: Pulley frente' }),
    );
    const dialog = within(screen.getByRole('dialog', { name: 'Editar exercício do treino' }));
    await userEvent.click(
      dialog.getByRole('button', { name: 'Tornar Puxada unilateral o principal' }),
    );
    await userEvent.click(dialog.getByRole('button', { name: 'Mais uma série' }));
    await userEvent.click(dialog.getByRole('checkbox', { name: /Opcional/ }));
    await userEvent.click(dialog.getByRole('button', { name: 'Salvar' }));

    await waitFor(async () => {
      expect((await db.templates.get('tpl-B'))?.slots[0]).toMatchObject({
        primaryExerciseId: 'puxada-unilateral',
        alternativeExerciseIds: ['puxada-pegada-neutra', 'pulley-frente'],
        plannedSets: 4,
        optional: true,
      });
    });
  });

  it('remove slot com desfazer', async () => {
    renderAt('/programa/b');
    await userEvent.click(
      await screen.findByRole('button', { name: /Editar Bíceps complementar/ }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Remover' }));
    await waitFor(async () => {
      expect(await slotIds()).not.toContain('Bíceps complementar');
    });
    await userEvent.click(screen.getByRole('button', { name: 'Desfazer' }));
    await waitFor(async () => {
      expect(await slotIds()).toContain('Bíceps complementar');
    });
  });
});

describe('Biblioteca', () => {
  it('busca e filtra por grupo muscular', async () => {
    renderAt('/biblioteca');
    await screen.findByText('39 exercícios');
    await userEvent.selectOptions(screen.getByLabelText('Grupo muscular'), 'panturrilha');
    expect(screen.getByText('2 exercícios')).toBeInTheDocument();
    await userEvent.type(screen.getByRole('searchbox'), 'leg press');
    expect(screen.getByText('1 exercício')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Panturrilha no leg press/ })).toBeInTheDocument();
  });

  it('cria exercício e valida campos', async () => {
    const router = renderAt('/biblioteca/novo');
    await userEvent.click(await screen.findByRole('button', { name: 'Criar exercício' }));
    expect(screen.getByText('Dê um nome ao exercício.')).toBeInTheDocument();
    expect(screen.getByText('Escolha ao menos um músculo.')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Nome'), 'Supino reto com barra');
    await userEvent.click(
      within(screen.getByRole('group', { name: 'Músculos primários' })).getByRole('button', {
        name: 'Peito',
      }),
    );
    await userEvent.selectOptions(screen.getByLabelText('Equipamento'), 'barra');
    await userEvent.click(screen.getByRole('button', { name: 'Criar exercício' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/biblioteca');
    });
    const created = (await db.exercises.toArray()).find((e) => e.name === 'Supino reto com barra');
    expect(created).toMatchObject({
      primaryMuscles: ['peito'],
      equipment: 'barra',
      archived: false,
    });
  });

  it('exercício no programa não exclui, mas arquiva', async () => {
    renderAt('/biblioteca/leg-press-45');
    expect(await screen.findByRole('button', { name: 'Excluir' })).toBeDisabled();
    expect(screen.getByText(/Está no programa/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Arquivar' }));
    await waitFor(async () => {
      expect((await db.exercises.get('leg-press-45'))?.archived).toBe(true);
    });
    expect(await screen.findByRole('button', { name: 'Desarquivar' })).toBeInTheDocument();
  });
});
