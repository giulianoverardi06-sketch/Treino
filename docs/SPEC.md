# SPEC — App de Treino ABC (PWA)

> Documento de escopo para execução no Claude Code. Fonte única de verdade do projeto.
> Idioma da interface: português (pt-BR). Unidades: kg.

---

## 1. Visão

App pessoal, mobile-first, para **registrar e monitorar treinos de musculação** na divisão **ABC contínua** (sem calendário fixo). Uso principal: celular, dentro da academia, com uma mão, muitas vezes offline.

Objetivos do app:
1. Registrar cada série de forma rápida (carga, repetições aproximadas, falha).
2. Mostrar a progressão por exercício ao longo do tempo.
3. Indicar qual é o próximo treino (A, B ou C) a partir da sequência real, não do dia da semana.
4. Permitir personalizar o programa: exercícios, ordem, séries e **opções secundárias** (alternativas) para cada exercício.
5. Mostrar uma imagem de referência de cada exercício.

### Princípios de produto
- **Registro em segundos.** A tela de sessão é a mais importante. Cada série deve ser registrada com no máximo 2–3 toques, usando como base os valores da última sessão.
- **Repetições não são obrigatórias.** O usuário não gosta de contar repetições de forma rígida. Repetições são opcionais e aproximadas. A carga e a marcação de falha são os dados principais.
- **Sem rigidez de calendário.** Nada reinicia na segunda-feira.
- **Os dados pertencem ao usuário.** Tudo fica no aparelho, com exportação e importação em JSON.

---

## 2. Decisões técnicas (fechadas)

| Tema | Decisão |
|---|---|
| Plataforma | PWA instalável (Android/iOS), funciona offline |
| Stack | Vite + React 18 + TypeScript (strict) |
| Estilo | Tailwind CSS, tema escuro por padrão, com tema claro opcional |
| Persistência | IndexedDB via **Dexie.js** (+ `dexie-react-hooks` / `useLiveQuery`) |
| Estado de UI | React state + Zustand apenas se for necessário (sessão ativa) |
| Rotas | React Router (hash router, para simplificar deploy estático) |
| Gráficos | Recharts |
| PWA | `vite-plugin-pwa` (Workbox), estratégia `generateSW`, precache do app e das imagens |
| Testes | Vitest + Testing Library (lógica de domínio com prioridade) |
| Deploy | Estático (Vercel ou GitHub Pages) |
| Backup | Exportar/importar JSON versionado |
| Imagens | **free-exercise-db** (yuhonas/free-exercise-db, domínio público / Unlicense) + upload próprio |

**Fora de escopo nesta versão (não implementar):** login, nuvem/sincronização, timer de descanso, peso corporal/medidas, notificações, integração com wearables, IA.

---

## 3. Modelo de domínio

### 3.1 Conceitos
- **Exercise** — item da biblioteca (ex.: "Elevação lateral com halteres").
- **WorkoutTemplate** — treino A, B ou C. É uma lista ordenada de *slots*.
- **Slot** — uma posição no treino. Tem um **exercício principal** e **alternativas** (as opções secundárias). Exemplo: o slot "Puxada vertical" tem como principal o pulley frente e como alternativa a puxada com pegada neutra. Também define as séries planejadas e se o slot é opcional.
- **Session** — uma execução real de um template, com data.
- **SetLog** — uma série executada dentro de uma sessão.

### 3.2 Tipos (TypeScript)

```ts
type Letter = 'A' | 'B' | 'C';

type MuscleGroup =
  | 'peito' | 'peito_superior' | 'deltoide_anterior' | 'deltoide_lateral'
  | 'deltoide_posterior' | 'dorsais' | 'costas_medias' | 'trapezio'
  | 'biceps' | 'triceps' | 'quadriceps' | 'posteriores' | 'gluteos'
  | 'panturrilha' | 'core';

interface Exercise {
  id: string;                 // uuid ou slug
  name: string;               // nome em pt-BR
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  equipment: 'maquina' | 'polia' | 'halteres' | 'barra' | 'peso_corporal' | 'outro';
  imageSource:
    | { kind: 'freeExerciseDb'; dbId: string }   // id do free-exercise-db
    | { kind: 'custom'; blobId: string }         // imagem enviada (tabela images)
    | { kind: 'none' };
  defaultIncrementKg: number; // ex.: 2.5 para máquina, 1 ou 2 para halteres
  notes?: string;             // dicas de execução
  archived: boolean;
  createdAt: string;          // ISO
}

interface Slot {
  id: string;
  label: string;              // ex.: "Puxada vertical"
  primaryExerciseId: string;
  alternativeExerciseIds: string[];   // opções secundárias
  plannedSets: number;
  optional: boolean;          // ex.: rosca alternada
  protocol?: 'padrao' | 'drop_lateral'; // ver 5.3
  notes?: string;
}

interface WorkoutTemplate {
  id: string;
  letter: Letter;
  name: string;               // "Peito, ombro e tríceps"
  emphasis: string;           // texto livre
  slots: Slot[];              // ordem = ordem de execução
  updatedAt: string;
}

interface Session {
  id: string;
  templateId: string;
  letter: Letter;
  startedAt: string;
  finishedAt?: string;        // undefined = sessão em andamento
  status: 'em_andamento' | 'concluida' | 'descartada';
  notes?: string;
  // snapshot da ordem e dos exercícios efetivamente usados
  entries: SessionEntry[];
}

interface SessionEntry {
  id: string;
  slotId?: string;            // null se foi adicionado na hora
  exerciseId: string;         // pode ser a principal ou uma alternativa
  order: number;
  skipped: boolean;
}

interface SetLog {
  id: string;
  sessionId: string;
  entryId: string;
  exerciseId: string;         // denormalizado para consultas de progressão
  setIndex: number;           // 1..n
  weightKg: number;
  reps?: number;              // OPCIONAL e aproximado
  toFailure: boolean;         // padrão: true
  rpeNote?: 'facil' | 'ok' | 'dificil'; // opcional, um toque
  note?: string;
  completedAt: string;
}

interface Settings {
  id: 'singleton';
  theme: 'dark' | 'light' | 'system';
  defaultToFailure: boolean;  // padrão: true
  lastBackupAt?: string;
  schemaVersion: number;
}
```

### 3.3 Tabelas Dexie

```
exercises:  id, name, archived
templates:  id, letter
sessions:   id, letter, startedAt, status
setLogs:    id, sessionId, exerciseId, completedAt, [exerciseId+completedAt]
images:     id                       // { id, blob, mime }
settings:   id
```

Faça a migração versionada com `db.version(n).upgrade(...)` desde o início.

---

## 4. Programa inicial (seed)

O seed roda na primeira abertura. Tudo fica editável depois. As alternativas abaixo são as **opções secundárias**.

### A — Peito, ombro e tríceps
Ênfase: peitoral superior + deltoide lateral.

| # | Slot | Principal | Alternativas | Séries |
|---|---|---|---|---|
| 1 | Pressão inclinada | Supino inclinado na máquina | Supino inclinado com halteres | 4 |
| 2 | Deltoide lateral | Elevação lateral com halteres (protocolo `drop_lateral`) | Elevação lateral na polia; Elevação lateral na máquina | 8 |
| 3 | Crucifixo ascendente | Crossover de baixo para cima | — | 3 |
| 4 | Crucifixo médio | Peck deck | Crossover médio | 3 |
| 5 | Tríceps (encurtado) | Tríceps na polia com corda | Tríceps na polia com barra | 3 |
| 6 | Tríceps (alongado) | Extensão de tríceps acima da cabeça na polia | Extensão acima da cabeça com halter | 3 |

### B — Costas e bíceps
Ênfase: dorsais + costas médias + postura.

| # | Slot | Principal | Alternativas | Séries | Opcional |
|---|---|---|---|---|---|
| 1 | Puxada vertical | Pulley frente | Puxada com pegada neutra; Puxada unilateral | 3 | não |
| 2 | Remada horizontal | Remada baixa | Remada na máquina | 3 | não |
| 3 | Remada costas médias | Remada apoiada com pegada aberta | Remada curvada com halteres apoiada | 3 | **sim** |
| 4 | Deltoide posterior | Peck deck reverso | Crucifixo inverso com halteres; Face pull | 3 | não |
| 5 | Bíceps principal | Rosca direta na polia | Rosca direta com barra | 3 | não |
| 6 | Bíceps complementar | Rosca alternada com halteres | Rosca martelo | 3 | **sim** |

### C — Pernas e core
Ênfase: desenvolvimento equilibrado dos membros inferiores.

| # | Slot | Principal | Alternativas | Séries | Opcional |
|---|---|---|---|---|---|
| 1 | Quadríceps composto | Leg press 45° | Hack squat | 3 | não |
| 2 | Extensão de quadril | Stiff com halteres | Stiff com barra; Elevação pélvica (hip thrust) | 3 | **sim** |
| 3 | Quadríceps isolado | Cadeira extensora | Hack squat leve | 3 | não |
| 4 | Posteriores | Mesa flexora | Cadeira flexora | 3 | não |
| 5 | Core | Abdominal na máquina | Crunch na polia | 3 | **sim** |
| 6 | Panturrilha | Panturrilha em pé na máquina | Panturrilha no leg press | 3 | **sim** |

> Os slots marcados como opcionais em B e C ainda estão sendo avaliados no programa. Por isso entram como opcionais: aparecem na sessão, mas podem ser pulados com um toque sem gerar "pendência".

### 4.1 Mapeamento de imagens
- Baixe `exercises.json` do free-exercise-db em **build time** (script `scripts/fetch-exercise-db.ts`) e gere `src/data/exerciseDbIndex.json`, contendo apenas `id`, `name`, `primaryMuscles`, `equipment` e `images`.
- Gere `src/data/seedImageMap.ts` mapeando cada exercício do seed para um `dbId`. **O Claude Code deve propor o mapeamento buscando por nome/equipamento e listar os casos duvidosos ou sem correspondência para revisão humana.** Não invente IDs.
- Copie para `public/exercise-images/<dbId>/0.jpg` e `1.jpg` **somente as imagens usadas no seed** e as que forem adicionadas depois. Assim o pacote fica leve e funciona offline (precache).
- Para exercícios sem correspondência (provável para máquinas específicas, como peck deck reverso e supino inclinado na máquina), use `imageSource: { kind: 'none' }`, mostre um placeholder com ícone do grupo muscular e permita upload.
- Upload próprio: foto da câmera ou galeria, redimensionada no cliente para no máximo 800px no lado maior, em JPEG com qualidade 0.8, guardada na tabela `images`.
- Inclua no rodapé de Configurações → Sobre: "Imagens: free-exercise-db (domínio público)".

---

## 5. Funcionalidades (MVP)

### 5.1 Início — "Próximo treino"
- Card grande mostrando a **letra sugerida**, o nome do treino e quantos dias se passaram desde a última sessão daquela letra.
- **Regra da sugestão:**
  1. Se existir sessão `em_andamento`, mostrar "Continuar sessão" no lugar da sugestão.
  2. Caso contrário, pegar a última sessão `concluida` e sugerir a próxima letra no ciclo A→B→C→A.
  3. Se não houver nenhuma sessão, sugerir A.
- **Aviso de sobreposição (informativo, não bloqueia):** se o treino sugerido tiver grupos musculares *primários* em comum com uma sessão concluída nas últimas 24h, mostrar um aviso discreto ("Bíceps trabalhado ontem"). Use `primaryMuscles` dos exercícios efetivamente executados.
- Botões secundários para iniciar qualquer outro treino (A/B/C). A escolha manual é livre.
- Faixa com um resumo: quantas sessões nos últimos 7 e 30 dias, e a data da última sessão de cada letra.
- Lembrete de backup se `lastBackupAt` tiver mais de 14 dias ou nunca tiver sido feito.

### 5.2 Sessão ativa (tela principal do app)
- Lista de exercícios na ordem dos slots. Cada item mostra a imagem miniatura, o nome, o progresso de séries (ex.: 2/3) e a referência da última sessão ("Última: 3×42,5 kg, falha").
- Ao tocar num exercício, o card expande com:
  - Imagem grande (alternar entre as fotos 0 e 1 com um toque, simulando o movimento) e as notas de execução.
  - **Trocar por alternativa:** um seletor com as opções secundárias do slot. A troca vale só para esta sessão; o template não muda. A sessão registra qual exercício foi realmente feito.
  - **Linhas de série:** uma por série planejada, já preenchidas com a carga da mesma série na última sessão daquele exercício.
    - Carga: stepper (−/+) usando `defaultIncrementKg`, e um toque no número abre o teclado numérico.
    - Repetições: campo opcional, vazio por padrão.
    - Falha: toggle, com padrão vindo de `settings.defaultToFailure`.
    - Confirmar série: botão ✓. Grava o `SetLog` imediatamente (sem botão "salvar" global).
  - "+ Série" para adicionar séries além do planejado. Remoção com deslizar ou ícone, com confirmação de desfazer (toast de 5s).
- Ações por exercício: pular, mover para cima/baixo nesta sessão, adicionar exercício da biblioteca ("+ Exercício").
- Slots opcionais aparecem com o rótulo "opcional" e um botão "pular".
- Finalizar sessão: mostra um resumo (exercícios feitos, total de séries, recordes batidos) e um campo de observação. Descartar sessão pede confirmação.
- **Resiliência:** tudo é persistido a cada série. Fechar o app ou perder a bateria não perde dados. Ao reabrir, a sessão continua de onde parou.
- Wake Lock API, quando disponível, para a tela não apagar durante a sessão (com toggle em Configurações).

### 5.3 Protocolo `drop_lateral` (elevação lateral)
- 8 séries planejadas. A carga inicial vem da última sessão (padrão do seed: 8 kg).
- Atalho por série: "↓ reduzir" aplica a redução configurada (padrão: −2 kg) nesta série e nas seguintes.
- Métrica específica, exibida no detalhe do exercício: **soma das repetições das séries 1–3 na carga inicial**, por sessão. Ela só aparece quando as repetições foram informadas e serve para avaliar se o protocolo de 8 séries está progredindo. Mostrar um aviso quando essa métrica ficar estável ou cair por 4 sessões seguidas: "Sem progressão nas séries iniciais há 4 sessões".

### 5.4 Histórico
- Lista de sessões em ordem cronológica reversa, com filtro por letra.
- Detalhe da sessão: exercícios e séries. As séries podem ser editadas depois (corrigir carga ou repetições) e a sessão pode ser excluída com confirmação.

### 5.5 Progressão e gráficos
Tela de detalhe do exercício, acessível pelo histórico, pela biblioteca e pela sessão:
- **Gráfico 1 — Carga máxima por sessão** (linha).
- **Gráfico 2 — Volume de carga por sessão** = Σ(carga × repetições). Só considera sessões com repetições preenchidas, e o gráfico indica isso.
- **Gráfico 3 — Séries efetivas por sessão** (barras).
- **Recordes:** maior carga; maior carga × repetições numa série; maior volume numa sessão. Mostrar a data de cada um.
- Período: 30 dias, 90 dias, 1 ano, tudo.
- Lista de sessões daquele exercício, com a tabela de séries.
- **Indicador de tendência** (texto simples): "Carga subiu X kg nas últimas N sessões", "Estável há N sessões" etc. Apenas descritivo, sem prescrever nada.

Visão geral (aba Progresso):
- Séries por grupo muscular nos últimos 7 e 30 dias, contando só os `primaryMuscles` (barras horizontais).
- **Equilíbrio empurrar/puxar:** séries de peito + deltoide anterior + tríceps contra dorsais + costas médias + deltoide posterior + bíceps, com uma razão simples. Informativo, sem meta fixa.

### 5.6 Programa (personalização)
- Editar cada template: nome, ênfase, adicionar/remover/reordenar slots (drag-and-drop com handle e alternativa por botões ↑↓ para acessibilidade).
- Editar slot: rótulo, exercício principal, alternativas (multi-seleção da biblioteca), séries planejadas, opcional, protocolo e notas.
- Promover uma alternativa a principal com um toque.
- Alterações no template **não** modificam sessões passadas.

### 5.7 Biblioteca de exercícios
- Lista com busca e filtro por grupo muscular e equipamento.
- Criar e editar exercício: nome, músculos primários e secundários, equipamento, incremento padrão, notas, imagem (buscar no free-exercise-db local, fazer upload ou nenhuma).
- "Buscar no banco aberto": pesquisa em `exerciseDbIndex.json`. Ao escolher, a imagem é baixada da URL raw do GitHub e guardada em `images` (exige estar online; tratar erro).
- Arquivar em vez de excluir quando o exercício tem histórico.

### 5.8 Configurações e backup
- Tema, falha padrão, redução padrão do protocolo lateral, wake lock.
- **Exportar:** gera um JSON `{ schemaVersion, exportedAt, exercises, templates, sessions, setLogs, settings, images(base64) }` e baixa como `treino-backup-AAAA-MM-DD.json`. Atualiza `lastBackupAt`.
- Opção "exportar sem imagens", para gerar um arquivo leve.
- **Importar:** valida o schema com zod, mostra um resumo (quantas sessões etc.) e pede confirmação. Modo **substituir tudo**, sempre criando antes um backup automático do estado atual, que é baixado.
- Exportar histórico em CSV (uma linha por série), para análise fora do app.
- Botão "Apagar todos os dados", com dupla confirmação.

---

## 6. Navegação e telas

Barra inferior com 4 abas:
1. **Início** — próximo treino / continuar sessão
2. **Histórico**
3. **Progresso**
4. **Programa** — templates + biblioteca (subabas)

Configurações: ícone no topo da aba Início.

Rotas:
```
/                       Início
/sessao/:id             Sessão ativa
/historico              Lista de sessões
/historico/:id          Detalhe da sessão
/progresso              Visão geral
/exercicio/:id          Detalhe e gráficos do exercício
/programa               Templates A/B/C
/programa/:letter       Editar template
/biblioteca             Biblioteca
/biblioteca/:id         Editar exercício
/config                 Configurações e backup
```

---

## 7. UX e visual

- Mobile-first, pensado para 360–430px de largura. No desktop, a coluna central tem no máximo 480px.
- Alvos de toque com no mínimo 44px. Os botões principais da sessão ficam na metade inferior da tela, para uso com uma mão.
- Tema escuro por padrão (academia, tela com brilho baixo). Alto contraste para os números de carga.
- Uma cor de destaque por letra (A, B, C), usada de forma consistente em cards, histórico e gráficos.
- Tipografia numérica tabular para cargas e repetições.
- Feedback imediato: série confirmada vira um estado "feito", com vibração curta (`navigator.vibrate`) se disponível.
- Estados vazios bem resolvidos: sem sessões, sem dados para gráfico, exercício sem imagem.
- Sem animações longas. Transições de no máximo 150ms.
- Acessibilidade: labels em todos os controles, foco visível, contraste AA.

---

## 8. Estrutura de pastas sugerida

```
src/
  app/            rotas, layout, providers
  db/             dexie schema, migrações, seed
  domain/         lógica pura (nextWorkout, progression, records, volume, backup)
  features/
    home/
    session/
    history/
    progress/
    program/
    library/
    settings/
  components/     UI compartilhada (Stepper, ExerciseImage, Chart wrappers…)
  data/           exerciseDbIndex.json, seedImageMap.ts, seedProgram.ts
  lib/            utils (datas, formatação pt-BR, ids)
scripts/
  fetch-exercise-db.ts
public/
  exercise-images/
  icons/          ícones do PWA (192, 512, maskable)
```

**Regra:** toda a lógica de cálculo fica em `domain/` como funções puras e testadas. Componentes não calculam progressão.

---

## 9. Testes e critérios de aceite

### Testes unitários obrigatórios (Vitest)
- `nextWorkout`: sem sessões → A; última concluída A → B; C → A; sessão em andamento tem prioridade; sessões descartadas são ignoradas.
- `overlapWarning`: detecta grupo primário repetido em menos de 24h; não alerta para grupos secundários.
- `prefillFromLastSession`: usa a última sessão do **exercício** (não do template), inclusive quando o exercício foi feito como alternativa em outro slot.
- `records` e `volume`: ignoram séries sem repetições no volume; maior carga considera todas.
- `lateralInitialRepsMetric`: soma das séries 1–3 apenas quando estão na carga inicial e com repetições informadas; aviso após 4 sessões sem aumento.
- `backup`: exportar → importar é idempotente (round-trip mantém contagens e valores).

### Critérios de aceite do MVP
1. Instala como app no Android (Chrome) e no iOS (Safari, "Adicionar à Tela de Início") e abre offline após a primeira visita.
2. Primeira abertura carrega o seed A/B/C com imagens nos exercícios que têm correspondência.
3. Registrar uma sessão completa do treino A leva menos de 2 toques por série quando a carga é igual à anterior.
4. Fechar o app no meio da sessão e reabrir mantém todas as séries registradas.
5. Trocar um exercício por uma alternativa na sessão não altera o template.
6. O gráfico do exercício mostra a evolução após 2 ou mais sessões.
7. A sugestão de próximo treino segue a sequência real, inclusive depois de dias de descanso.
8. Exportar e importar o backup restaura o estado completo.
9. Lighthouse PWA "installable" OK; performance ≥ 90 no mobile.

---

## 10. Plano de execução por fases (Claude Code)

Cada fase termina com o app rodando e os testes da fase passando. Ao fim de cada fase, apresentar um resumo do que foi feito e esperar aprovação antes de seguir.

| Fase | Entrega |
|---|---|
| 0 | Setup: Vite + React + TS strict + Tailwind + Router + Vitest + ESLint/Prettier. Layout com barra inferior e rotas vazias. |
| 1 | Camada de dados: schema Dexie, tipos, seed do programa (sem imagens), funções `domain/` com testes. |
| 2 | Sessão ativa completa (5.2 e 5.3), incluindo pré-preenchimento, alternativas e persistência por série. |
| 3 | Início com próximo treino, aviso de sobreposição e "continuar sessão". |
| 4 | Histórico (5.4) e edição de séries passadas. |
| 5 | Progressão e gráficos (5.5). |
| 6 | Programa e biblioteca (5.6 e 5.7), sem imagens. |
| 7 | Imagens: script do free-exercise-db, mapeamento do seed **com lista de pendências para revisão**, placeholder, upload e busca no banco aberto. |
| 8 | PWA (manifest, ícones, service worker, precache), backup JSON/CSV, configurações, wake lock. |
| 9 | Polimento: estados vazios, acessibilidade, Lighthouse, deploy. |

---

## 11. Evoluções futuras (não implementar agora)
- Timer de descanso por exercício.
- Registro de peso corporal e medidas, com gráfico.
- Sincronização opcional em nuvem (Supabase), mantendo o modelo local-first.
- Rotina de mobilidade e postura (checklist curto diário).
- Comparação de fotos de evolução estética.
- Exportação direta para planilha.

---

## 12. Extensões aprovadas depois do MVP

### 12.1 Rotação de 2 a 5 treinos
- O programa tem de 2 a 5 treinos, com letras consecutivas a partir de A (A, B, C, D, E).
  Criar acrescenta a próxima letra (vazia, para montar); remover tira só a última letra, com
  confirmação. Sessões antigas de uma letra removida continuam no histórico.
- A sugestão segue a ordem das letras que existem: A→B→…→última→A. Se a última sessão concluída
  for de uma letra que não existe mais, sugere a próxima letra existente depois dela (ou A).
- Cada letra tem uma cor própria (paleta validada nos dois temas); D usa letra preta no quadrado.

### 12.2 Cardio avulso
- Registro separado da rotação: não muda a sugestão do próximo treino nem o aviso de sobreposição.
- Campos: atividade (esteira, bicicleta, corrida, elíptico, escada, natação, caminhada, outro com
  nome livre), data e hora, duração em minutos (obrigatória), distância em km (opcional),
  intensidade leve/moderada/forte (opcional) e observação.
- Aparece no Início (botão "Registrar cardio" e totais da semana), no Histórico (linhas próprias e
  filtro "Cardio") e no Progresso (minutos e km em 7/30 dias). Velocidade média é calculada quando
  há distância.
- Entra no backup JSON (versão 3; backups das versões 1 e 2 continuam importáveis).
