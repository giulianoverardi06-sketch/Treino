# Treino ABC — notas para o Claude Code

- **Fonte única de verdade:** [docs/SPEC.md](docs/SPEC.md). Leia antes de qualquer fase.
- Execução por fases (SPEC §10). Ao fim de cada fase: app rodando, `npm run lint`, `npm run typecheck`
  e `npm test` passando, resumo para o usuário e **esperar aprovação** antes da fase seguinte.
- Interface em pt-BR, unidades em kg.
- Toda lógica de cálculo vai em `src/domain/` como funções puras com testes. Componentes não calculam progressão.
- Estado das fases:
  - [x] Fase 0 — setup, layout com barra inferior, rotas vazias
  - [x] Fase 1 — dados (Dexie), tipos, seed, `domain/` com testes
  - [x] Fase 2 — sessão ativa (5.2 e 5.3); Início provisório com iniciar A/B/C e continuar
  - [x] Fase 3 — Início com próximo treino, sobreposição e continuar sessão
  - [x] Fase 4 — Histórico (5.4) e edição de séries passadas
  - [ ] Fase 5 — Progressão e gráficos (5.5)

## Decisões que desviam ou completam o SPEC

- `exercises.archived` não é indexado no Dexie (booleano não é chave válida no IndexedDB); filtrar em memória.
- `Slot.startWeightKg` (opcional): carga quando o exercício nunca foi feito (lateral: 8 kg).
- `SessionEntry` guarda snapshot do slot: `label`, `plannedSets`, `optional`, `protocol`.
- `Settings` ganhou `lateralDropKg` (padrão 2) e `wakeLock` (padrão true), citados em §5.3/§5.8.
- "Hack squat leve" é um exercício separado do "Hack squat", para não misturar referências de carga.
- Métrica lateral: "sem aumento" = não superar a melhor soma já feita na mesma carga inicial;
  mudar a carga inicial zera a contagem.
- Testes de backup (§9) ficam para a Fase 8, junto com a exportação/importação.
- Sessão ativa: séries confirmadas vão para o IndexedDB na hora (`src/db/sessionRepo.ts`); valores
  editados antes do ✓ são rascunhos no localStorage (`features/session/draftStore.ts`, Zustand).
- Só uma sessão em andamento por vez (`startSession` devolve a existente).
- Trocar por alternativa só antes de registrar séries daquela entrada (evita misturar exercícios).
- Ao confirmar com carga diferente da pré-preenchida, as séries seguintes não editadas com a mesma
  carga pré-preenchida acompanham (`propagateWeight`). "↓ reduzir" nunca aumenta séries seguintes.
- Remover série renumera as seguintes (mantém 1..n contíguo para a métrica lateral).
- Sessão descartada mantém as séries no banco, mas não conta em nada.
- RPE (fácil/ok/difícil): um toque logo abaixo da última série confirmada.
- Início: lembrete de backup só aparece quando já existe ao menos uma sessão concluída.
- Com sessão em andamento, os botões de outros treinos somem (só uma sessão por vez).
- "Últimos 7/30 dias" contam dias de calendário, com hoje incluído.
- `useLiveQuery` devolve o `now` junto com os dados, para o render continuar puro (lint do React).
- Histórico lista só sessões concluídas, agrupadas por mês; filtro por letra fica na URL (`?letra=B`).
  Descartadas não aparecem na lista (o detalhe delas ainda abre pela URL, com aviso).
- Excluir sessão apaga a sessão e as séries dela de vez (com confirmação; sem desfazer).
- Nomes acessíveis compostos usam `aria-label` em vez de `sr-only` + texto (o espaço entre
  elementos se perde no cálculo do nome).

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
