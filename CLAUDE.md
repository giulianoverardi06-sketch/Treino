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
  - [x] Fase 5 — Progressão e gráficos (5.5)
  - [x] Fase 6 — Programa e biblioteca (5.6 e 5.7), sem imagens
  - [ ] Fase 7 — Imagens (free-exercise-db, upload)

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
- Gráficos usam os tokens por classe CSS (`fill-letter-a` etc.), porque o Recharts escreve cores
  como atributo SVG; rótulos dos eixos recebem `style` inline com `var(--text-muted)`.
- Gráficos: ponto colorido pela letra da sessão; um único eixo; tooltip; tabela em "Ver tabela".
- "Séries por sessão" = séries registradas (não só as até a falha).
- Recordes do exercício são de todo o histórico; o período filtra gráficos e lista.
- Tendência: estável se a carga máxima repete nas últimas 3+ sessões; senão compara a última com a
  primeira de uma janela de até 5 sessões.
- Métrica lateral só usa sessões em que a entrada do exercício estava no protocolo `drop_lateral`.
- Equilíbrio empurrar/puxar: peito superior conta como peito.
- Bundle passou de 500 kB por causa do Recharts; dividir as rotas de gráfico na Fase 9.
- Programa: edições do treino salvam na hora (nome/ênfase ao sair do campo; ordem, adicionar e
  remover slot imediatamente, remover com desfazer). O slot é editado numa folha com "Salvar".
  Reordenar: arrastar pela alça (@dnd-kit, também por teclado) ou setas ↑↓.
- Biblioteca: excluir só exercício sem histórico e fora do programa; senão arquivar
  (`deletionPolicy`). Nome único entre não arquivados, comparado sem acento/caixa.
- Erros de formulário ficam fora do `<label>` e ligados por `aria-describedby` (dentro do label
  mudariam o nome acessível do campo).

## Comandos

```
npm run dev         # servidor de desenvolvimento
npm test            # Vitest (uma vez)
npm run lint        # ESLint (type-aware)
npm run typecheck   # tsc -b
npm run build       # typecheck + build de produção
npm run format      # Prettier
```

## Visual (leia antes de mexer em UI)

- Mundo visual: sinalização de terminal de aeroporto, escolhido no redesign com a skill impeccable.
  Regras e tokens em [DESIGN.md](DESIGN.md); produto em [PRODUCT.md](PRODUCT.md); contrato da
  direção em `.impeccable/surfaces/src-app-applayout-tsx.md`.
- Amarelo `sign` só para caminho / próxima ação (placa do Início, faixa da série da vez, ✓ da série
  ativa, Finalizar quando tudo foi registrado, aba ativa). Nunca como enfeite.
- Peças: `Tile`, `LetterTile`, `ArrowLead` (`components/Sign.tsx`), `Button` + `buttonStyles.ts`.
  Listas e gráficos de consulta ficam dentro de um quadro emoldurado
  (`rounded-[4px] border-2 border-edge bg-surface`). Raio ≤ 4px, sem sombras.
- Fonte: Source Sans 3 Variable empacotada (`@fontsource-variable`), algarismos tabulares nativos.

## Convenções

- Alias `@/` → `src/`.
- Cores via tokens em `src/index.css` (`bg`, `surface`, `surface-2`, `border`, `edge`, `text`,
  `muted`, `sign`, `on-sign`, `tile`, `on-tile`, `letter-a|b|c`, `focus`). Tema escuro é o padrão;
  claro via `<html data-theme="light">`.
- Utilitário `num` para dígitos tabulares; `flap` para a troca da placa (≤150ms).
- Hash router (`createHashRouter`); a lista de rotas fica em `src/app/routes.tsx` e é reutilizada nos testes.
- Alvos de toque ≥ 44px (`min-h-11`/`size-11`), transições ≤ 150ms.
