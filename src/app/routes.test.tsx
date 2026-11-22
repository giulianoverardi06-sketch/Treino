import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { routes } from './routes';

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

const nav = () => screen.getByRole('navigation', { name: 'Navegação principal' });

describe('rotas e layout', () => {
  it.each([
    ['/', 'Treino ABC'],
    ['/historico', 'Histórico'],
    ['/historico/s1', 'Detalhe da sessão'],
    ['/progresso', 'Progresso'],
    ['/exercicio/e1', 'Exercício'],
    ['/programa', 'Programa'],
    ['/programa/b', 'Treino B'],
    ['/biblioteca', 'Programa'],
    ['/biblioteca/e1', 'Editar exercício'],
    ['/config', 'Configurações'],
  ])('%s renderiza "%s"', (path, title) => {
    renderAt(path);
    expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument();
  });

  it('sessão inexistente mostra aviso', async () => {
    renderAt('/sessao/nao-existe');
    expect(await screen.findByText('Sessão não encontrada.')).toBeInTheDocument();
  });

  it('rota desconhecida volta para o Início', () => {
    const router = renderAt('/nao-existe');
    expect(router.state.location.pathname).toBe('/');
  });

  it('barra inferior tem 4 abas e marca a atual', () => {
    renderAt('/biblioteca');
    const links = screen.getAllByRole('link').filter((l) => nav().contains(l));
    expect(links.map((l) => l.textContent)).toEqual([
      'Início',
      'Histórico',
      'Progresso',
      'Programa',
    ]);
    expect(
      within(nav()).getByRole('link', { name: 'Programa', current: 'page' }),
    ).toBeInTheDocument();
    expect(within(nav()).getAllByRole('link', { current: 'page' })).toHaveLength(1);
  });

  it('esconde a barra inferior durante a sessão ativa', () => {
    renderAt('/sessao/s1');
    expect(screen.queryByRole('navigation', { name: 'Navegação principal' })).toBeNull();
  });

  it('navega pelas abas', async () => {
    const router = renderAt('/');
    await userEvent.click(screen.getByRole('link', { name: 'Histórico' }));
    expect(router.state.location.pathname).toBe('/historico');
    expect(screen.getByRole('heading', { level: 1, name: 'Histórico' })).toBeInTheDocument();
  });

  it('Configurações fica acessível pelo ícone no Início', async () => {
    const router = renderAt('/');
    await userEvent.click(screen.getByRole('link', { name: 'Configurações' }));
    expect(router.state.location.pathname).toBe('/config');
  });
});

describe('Programa lê o banco', () => {
  it('lista os treinos do seed', async () => {
    renderAt('/programa');
    expect(await screen.findByText('Peito, ombro e tríceps')).toBeInTheDocument();
    expect(screen.getByText('Costas e bíceps')).toBeInTheDocument();
    expect(screen.getByText('Pernas e core')).toBeInTheDocument();
    expect(screen.getByText('6 exercícios · 3 opcionais')).toBeInTheDocument();
  });
});
