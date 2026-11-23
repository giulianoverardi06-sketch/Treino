import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { routes } from '@/app/routes';
import { clearAllData, exportBackup } from '@/db/backupRepo';
import { db } from '@/db/db';
import { startSession } from '@/db/sessionRepo';

const createObjectURL = vi.fn(() => 'blob:x');

beforeEach(async () => {
  await clearAllData();
  await db.sessions.clear();
  await db.setLogs.clear();
  // jsdom não tem URL.createObjectURL (usado no download).
  createObjectURL.mockClear();
  Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() });
});

function renderSettings() {
  const router = createMemoryRouter(routes, { initialEntries: ['/config'] });
  render(<RouterProvider router={router} />);
  return router;
}

const settings = () => db.settings.get('singleton');

describe('Configurações', () => {
  it('tema, falha padrão, tela acesa e redução lateral salvam na hora', async () => {
    renderSettings();
    await userEvent.click(await screen.findByRole('radio', { name: 'Claro' }));
    await waitFor(async () => {
      expect((await settings())?.theme).toBe('light');
    });
    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe('light');
    });

    await userEvent.click(screen.getByRole('switch', { name: /Série até a falha por padrão/ }));
    await userEvent.click(screen.getByRole('switch', { name: /Manter a tela acesa/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Aumentar redução' }));
    await waitFor(async () => {
      expect(await settings()).toMatchObject({
        defaultToFailure: false,
        wakeLock: false,
        lateralDropKg: 2.5,
      });
    });
  });

  it('exportar baixa o arquivo e marca a data do backup', async () => {
    renderSettings();
    await userEvent.click(await screen.findByRole('button', { name: 'Exportar backup' }));
    await waitFor(async () => {
      expect((await settings())?.lastBackupAt).toBeDefined();
    });
    expect(createObjectURL).toHaveBeenCalled();
  });

  it('importar arquivo inválido mostra o erro e não muda nada', async () => {
    renderSettings();
    const input = await screen.findByLabelText('Importar backup');
    fireEvent.change(input, {
      target: { files: [new File(['{oops'], 'x.json', { type: 'application/json' })] },
    });
    expect(await screen.findByText('O arquivo não é um JSON válido.')).toBeInTheDocument();
  });

  it('importar backup válido mostra o resumo e substitui tudo', async () => {
    await startSession('C');
    await db.sessions.toCollection().modify({ status: 'concluida' });
    const backup = await exportBackup({ includeImages: true });
    await clearAllData();

    const router = renderSettings();
    fireEvent.change(await screen.findByLabelText('Importar backup'), {
      target: { files: [new File([JSON.stringify(backup)], 'meu.json')] },
    });
    const dialog = within(await screen.findByRole('dialog', { name: 'Importar backup?' }));
    expect(dialog.getByText('Sessões concluídas').nextSibling).toHaveTextContent('1');
    await userEvent.click(dialog.getByRole('button', { name: 'Substituir tudo' }));

    await waitFor(async () => {
      expect(await db.sessions.count()).toBe(1);
    });
    expect(router.state.location.pathname).toBe('/');
  });

  it('apagar tudo pede duas confirmações e a palavra "apagar"', async () => {
    await startSession('A');
    renderSettings();
    await userEvent.click(await screen.findByRole('button', { name: 'Apagar todos os dados' }));
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    const confirm = screen.getByRole('button', { name: 'Apagar tudo' });
    expect(confirm).toBeDisabled();
    await userEvent.type(screen.getByRole('textbox'), 'apagar');
    await userEvent.click(confirm);
    await waitFor(async () => {
      expect(await db.sessions.count()).toBe(0);
    });
  });
});
