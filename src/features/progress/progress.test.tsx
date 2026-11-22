import { render, screen, within } from '@testing-library/react';
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

const DAY = 86_400_000;

/**
 * Sessão concluída há `daysAgo` dias com séries em `slotIndex` (0 = 1º exercício do treino).
 * `sets`: [peso, reps?][]
 */
async function done(letter: Letter, daysAgo: number, sets: [number, number?][], slotIndex = 0) {
  const id = await startSession(letter);
  const entry = (await db.sessions.get(id))?.entries[slotIndex];
  if (!entry) throw new Error('seed');
  for (const [i, [w, reps]] of sets.entries()) {
    await confirmSet({
      sessionId: id,
      entryId: entry.id,
      exerciseId: entry.exerciseId,
      setIndex: i + 1,
      weightKg: w,
      toFailure: true,
      ...(reps === undefined ? {} : { reps }),
    });
  }
  const start = Date.now() - daysAgo * DAY;
  await db.sessions.update(id, {
    status: 'concluida',
    startedAt: new Date(start).toISOString(),
    finishedAt: new Date(start + 3_600_000).toISOString(),
  });
  return id;
}

describe('Detalhe do exercício', () => {
  it('sem registros', async () => {
    renderAt('/exercicio/peck-deck');
    expect(await screen.findByText('Ainda sem registros deste exercício.')).toBeInTheDocument();
  });

  it('tendência, recordes, gráficos e sessões', async () => {
    await done('A', 20, [
      [40, 10],
      [40, 9],
      [40, 8],
    ]);
    await done('A', 10, [[42.5], [42.5], [40]]);
    await done('A', 2, [
      [45, 8],
      [42.5, 9],
      [42.5, 8],
    ]);
    renderAt('/exercicio/supino-inclinado-maquina');

    expect(await screen.findByText('Carga subiu 5 kg nas últimas 3 sessões.')).toBeInTheDocument();

    const records = within(screen.getByRole('region', { name: 'Recordes' }));
    expect(records.getByText('Maior carga').nextSibling).toHaveTextContent('45 kg');
    expect(records.getByText('Melhor série (carga × reps)').nextSibling).toHaveTextContent(
      '40 kg × 10', // 400 > 45×8 = 360
    );
    // 1ª: 40×27 = 1080; 3ª: 45×8 + 42,5×9 + 42,5×8 = 1082,5 → recorde é a última.
    expect(records.getByText('Maior volume numa sessão').nextSibling).toHaveTextContent(
      '1.082,5 kg',
    );

    expect(screen.getByRole('figure', { name: 'Carga máxima por sessão' })).toBeInTheDocument();
    expect(screen.getByText(/Só sessões com repetições \(2 de 3\)/)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Sessões no período (3)' })).toBeInTheDocument();
  });

  it('filtro de período', async () => {
    await done('A', 200, [[30]]);
    await done('A', 2, [[45]]);
    renderAt('/exercicio/supino-inclinado-maquina');
    expect(
      await screen.findByRole('region', { name: 'Sessões no período (1)' }),
    ).toBeInTheDocument();
    expect(screen.getByText('1 sessão anterior fora do período.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('radio', { name: 'Tudo' }));
    expect(screen.getByRole('region', { name: 'Sessões no período (2)' })).toBeInTheDocument();
  });

  it('protocolo lateral: métrica das séries iniciais e aviso de estagnação', async () => {
    const drop = (r: number): [number, number?][] => [
      [8, r],
      [8, r],
      [8, r],
      [6],
      [6],
      [4],
      [4],
      [4],
    ];
    for (const daysAgo of [10, 8, 6, 4, 2]) await done('A', daysAgo, drop(10), 1);
    renderAt('/exercicio/elevacao-lateral-halteres');

    const metric = within(
      await screen.findByRole('region', { name: 'Séries iniciais (1–3) na carga inicial' }),
    );
    expect(metric.getAllByText('30')).toHaveLength(5);
    expect(metric.getByText('Sem progressão nas séries iniciais há 4 sessões')).toBeInTheDocument();
  });
});

describe('Aba Progresso', () => {
  it('vazio sem sessões', async () => {
    renderAt('/progresso');
    expect(await screen.findByText('Sem treinos concluídos ainda.')).toBeInTheDocument();
  });

  it('séries por grupo primário, equilíbrio e lista de exercícios', async () => {
    await done('A', 1, [[40], [40], [40]]); // supino: peito superior (empurrar)
    await done('B', 2, [[50], [50]]); // pulley: dorsais (puxar)
    await done('B', 20, [[50], [50], [50], [50]]); // fora dos 7 dias
    renderAt('/progresso');

    const muscles = within(
      await screen.findByRole('region', { name: 'Séries por grupo muscular' }),
    );
    expect(muscles.getByText('Peito superior').parentElement).toHaveTextContent('3');
    expect(muscles.getByText('Dorsais').parentElement).toHaveTextContent('2');
    expect(muscles.queryByText('Bíceps')).toBeNull(); // secundário do pulley

    const balance = within(screen.getByRole('region', { name: 'Equilíbrio empurrar / puxar' }));
    expect(balance.getByText('Razão').nextSibling).toHaveTextContent('1,5');

    await userEvent.click(screen.getByRole('radio', { name: '30 dias' }));
    expect(muscles.getByText('Dorsais').parentElement).toHaveTextContent('6');

    const list = within(screen.getByRole('region', { name: 'Exercícios' }));
    expect(list.getAllByRole('link').map((l) => l.textContent)).toEqual([
      expect.stringContaining('Supino inclinado na máquina'),
      expect.stringContaining('Pulley frente'),
    ]);
  });
});
