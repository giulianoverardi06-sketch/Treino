# Treino ABC — notas para o Claude Code

- **Fonte única de verdade:** [docs/SPEC.md](docs/SPEC.md). Leia antes de qualquer fase.
- Execução por fases (SPEC §10). Ao fim de cada fase: app rodando, `npm run lint`, `npm run typecheck`
  e `npm test` passando, resumo para o usuário e **esperar aprovação** antes da fase seguinte.
- Interface em pt-BR, unidades em kg.
- Toda lógica de cálculo vai em `src/domain/` como funções puras com testes. Componentes não calculam progressão.
- Estado das fases:
  - [x] Fase 0 — setup, layout com barra inferior, rotas vazias
  - [ ] Fase 1 — dados (Dexie), tipos, seed, `domain/` com testes

## Comandos

```
npm run dev         # servidor de desenvolvimento
npm test            # Vitest (uma vez)
npm run lint        # ESLint (type-aware)
npm run typecheck   # tsc -b
npm run build       # typecheck + build de produção
npm run format      # Prettier
```

## Convenções

- Alias `@/` → `src/`.
- Cores via tokens em `src/index.css` (`bg`, `surface`, `surface-2`, `border`, `text`, `muted`,
  `letter-a|b|c`, `danger`, `focus`). Tema escuro é o padrão; claro via `<html data-theme="light">`.
- Utilitário `num` para dígitos tabulares em cargas/repetições.
- Hash router (`createHashRouter`); a lista de rotas fica em `src/app/routes.tsx` e é reutilizada nos testes.
- Alvos de toque ≥ 44px (`min-h-11`/`size-11`), transições ≤ 150ms.
