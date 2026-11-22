---
name: Treino ABC
description: Registro de treino A/B/C no celular, lido como sinalização de terminal.
colors:
  bg: "#0b0b0b"
  surface: "#1a1a1a"
  surface-2: "#262626"
  border: "#3d3d3d"
  edge: "#5c5c5c"
  text: "#ffffff"
  text-muted: "#b8b8b8"
  sign: "#ffcc00"
  on-sign: "#0b0b0b"
  on-sign-muted: "#3d3300"
  tile: "#000000"
  on-tile: "#ffffff"
  accent-a: "#d0342c"
  accent-b: "#3a8ff0"
  accent-c: "#16a8a0"
  focus: "#ffcc00"
  bg-light: "#e6e6e6"
  surface-light: "#ffffff"
  surface-2-light: "#f2f2f2"
  border-light: "#c4c4c4"
  edge-light: "#0b0b0b"
  text-light: "#0b0b0b"
  text-muted-light: "#4a4a4a"
  tile-light: "#0b0b0b"
  accent-a-light: "#b42318"
  accent-b-light: "#175cd3"
  accent-c-light: "#008a72"
  focus-light: "#0b0b0b"
typography:
  display:
    fontFamily: "'Source Sans 3 Variable', 'Segoe UI', system-ui, sans-serif"
    fontSize: "8rem"
    fontWeight: 900
    lineHeight: 0.85
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "'Source Sans 3 Variable', 'Segoe UI', system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  sign-title:
    fontFamily: "'Source Sans 3 Variable', 'Segoe UI', system-ui, sans-serif"
    fontSize: "1.625rem"
    fontWeight: 800
    lineHeight: 1.05
  title:
    fontFamily: "'Source Sans 3 Variable', 'Segoe UI', system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 700
    lineHeight: 1.25
  section:
    fontFamily: "'Source Sans 3 Variable', 'Segoe UI', system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 800
    lineHeight: 1.4
  number:
    fontFamily: "'Source Sans 3 Variable', 'Segoe UI', system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    fontFeature: "'tnum' 1, 'lnum' 1"
  body:
    fontFamily: "'Source Sans 3 Variable', 'Segoe UI', system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: "'Source Sans 3 Variable', 'Segoe UI', system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.4
rounded:
  segment: "2px"
  tile: "3px"
  control: "4px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  gutter: "16px"
  header: "20px"
  section: "32px"
components:
  button-go:
    backgroundColor: "{colors.sign}"
    textColor: "{colors.on-sign}"
    typography: "{typography.section}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "56px"
  button-ink:
    backgroundColor: "{colors.tile}"
    textColor: "{colors.on-tile}"
    typography: "{typography.section}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "56px"
  button-solid:
    backgroundColor: "{colors.text}"
    textColor: "{colors.bg}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "48px"
  button-outline:
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "48px"
  button-outline-hover:
    backgroundColor: "{colors.surface-2}"
  button-quiet:
    textColor: "{colors.text-muted}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "44px"
  tile:
    backgroundColor: "{colors.tile}"
    textColor: "{colors.on-tile}"
    rounded: "{rounded.tile}"
    size: "44px"
  letter-tile-a:
    backgroundColor: "{colors.accent-a}"
    textColor: "#ffffff"
    rounded: "{rounded.tile}"
    size: "44px"
  letter-tile-b:
    backgroundColor: "{colors.accent-b}"
    textColor: "#ffffff"
    rounded: "{rounded.tile}"
    size: "44px"
  letter-tile-c:
    backgroundColor: "{colors.accent-c}"
    textColor: "#ffffff"
    rounded: "{rounded.tile}"
    size: "44px"
  board:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "0 12px"
  segmented-active:
    backgroundColor: "{colors.text}"
    textColor: "{colors.bg}"
    rounded: "{rounded.segment}"
    height: "44px"
  nav-tab-active:
    backgroundColor: "{colors.sign}"
    textColor: "{colors.on-sign}"
    rounded: "{rounded.tile}"
    height: "56px"
  toast:
    backgroundColor: "{colors.tile}"
    textColor: "{colors.on-tile}"
    rounded: "{rounded.control}"
    height: "56px"
---

# Design System: Treino ABC

## Overview

**Creative North Star: "O Próximo Passo Sinalizado"**

O app se lê como a sinalização de um terminal: há sempre uma placa amarela dizendo para onde ir agora, e todo o resto é preto de placa, moldura e sequência numerada. Nas telas de decisão (Início, Sessão) a placa amarela carrega a próxima decisão; nas telas de consulta (Histórico, Progresso, Exercício) os dados aparecem como quadros de partidas emoldurados, linha a linha; cada linha de lista começa por um quadrado preto com pictograma ou número branco.

A densidade é de uso com uma mão entre séries: alvos de 44px ou mais, ações da sessão na metade de baixo, números tabulares grandes, uma coluna central de no máximo 480px. O material é chapado e gráfico: sem sombras, sem gradientes, profundidade só por inversão de tinta e por molduras de 2px. Movimento é um único gesto, o painel split-flap: a mensagem nova desce para o lugar em 140ms.

O mundo substituiu deliberadamente os cartões arredondados iguais e o tema escuro com acentos chapados da versão anterior.

**Key Characteristics:**
- Amarelo de sinalização reservado para caminho e próxima ação.
- Quadrados pretos (tiles) com pictograma ou número branco à esquerda das linhas.
- Quadrados de saguão A/B/C na cor validada de cada treino, letra em branco.
- Molduras retas de 2px, raio de 2 a 4px, nunca maior.
- Source Sans 3 Variable empacotada, pesos 800 a 900 nas placas, algarismos tabulares nos números.
- Tema escuro por padrão; claro via `html[data-theme="light"]`.

## Colors

Paleta de sinalização: preto de placa e cinzas neutros como chão, um único amarelo de caminho e três cores categóricas de treino.

### Primary
- **Amarelo de Sinalização** (`sign`): a placa da próxima decisão (Início e cabeçalho fixo da Sessão), o botão `go`, a aba ativa da barra inferior, o ✓ da série da vez, a ação do toast, a seleção de texto e o cursor. Em cima dele o texto é `on-sign` (preto de placa) e o texto secundário é `on-sign-muted` (oliva escuro). Igual nos dois temas.

### Secondary
- **Vermelho de Saguão A** (`accent-a`; claro `accent-a-light`): treino A.
- **Azul de Saguão B** (`accent-b`; claro `accent-b-light`): treino B.
- **Verde-azulado de Saguão C** (`accent-c`; claro `accent-c-light`): treino C.

As três foram validadas como paleta categórica (todos os pares, incluindo simulação de daltonismo) sobre a moldura de cada tema. Aparecem no quadrado de saguão, no filtro de letra selecionado, nos pontos e barras dos gráficos e no histórico, sempre como cor de identificação, nunca como cor de ação.

### Neutral
- **Preto de Placa** (`bg`; claro: Cinza de Superfície `bg-light`): fundo da página.
- **Moldura** (`surface`; claro `surface-light`): fundo dos quadros, folhas e linhas de aviso.
- **Moldura Funda** (`surface-2`; claro `surface-2-light`): hover de linhas e controles, linha da série da vez.
- **Fio de Separação** (`border`; claro `border-light`): divisórias de 1px entre linhas de quadro.
- **Contorno de Controle** (`edge`; claro `edge-light`): molduras de 2px de quadros, placas emolduradas, segmentados e botões `outline`; a borda superior de 4px das folhas.
- **Branco de Pictograma** (`text`, `on-tile`; claro `text-light`): texto principal e tinta dos tiles.
- **Cinza de Legenda** (`text-muted`; claro `text-muted-light`): texto secundário, rótulos de coluna, abas inativas.
- **Quadrado Preto** (`tile`; claro `tile-light`): tiles, botão `ink`, barra inferior, toast, tooltip de gráfico. Continua preto no tema claro.
- **Foco** (`focus`; claro `focus-light`): contorno de foco de 3px com afastamento de 2px; amarelo no escuro, preto no claro, e sempre preto (`on-sign`) sobre a placa amarela.

### Named Rules
**The One Path Rule.** O amarelo de sinalização marca só o caminho: a próxima ação, a série da vez, a aba onde você está. Nada decorativo, nenhum estado de erro, nenhum gráfico é amarelo. Se dois elementos amarelos competem na mesma vista, um deles está errado.

**The Lobby Color Rule.** Cada treino tem uma cor e só uma; vermelho, azul e verde-azulado identificam A, B e C e não significam mais nada. A letra sobre elas é sempre branca.

**The Ink Inversion Rule.** Estado se mostra invertendo a tinta (`text` vira fundo, `bg` vira texto), não com uma cor nova: série registrada, segmento ativo, filtro "Todos" selecionado, confirmação em diálogo.

## Typography

**Display Font:** Source Sans 3 Variable (com Segoe UI, system-ui, sans-serif)
**Body Font:** Source Sans 3 Variable (mesma família)

**Character:** Uma única humanista de sinalização, empacotada via `@fontsource-variable/source-sans-3` para funcionar offline. Hierarquia por peso e escala, não por troca de família. Foi escolhida por ter algarismos tabulares; a Signika foi descartada por não ter.

### Hierarchy
- **Display** (900, 8rem, 0.85, -0.04em): a letra monumental do próximo treino na placa amarela. Uso único por tela.
- **Headline** (800, 1.75rem, 1.1, -0.01em): título de página no `PageHeader`.
- **Sign title** (800, 1.625rem, 1.05): nome do treino dentro da placa.
- **Title** (700, 1.375rem): título de folha (Modal).
- **Section** (800, 1.125rem): títulos de seção ("Outros treinos", "Resumo") e cabeçalho de grupo do histórico; também o rótulo dos botões grandes (`go`, `ink`, em 600).
- **Number** (700, 1.75rem, tabular): carga no campo de peso; contagens do resumo final a 2rem.
- **Body** (400, 1rem, 1.4): texto corrido, linhas de quadro.
- **Label** (600, 0.875rem): texto secundário, legenda de gráfico, botões `quiet`; rótulos da barra inferior a 0.8125rem; rótulos de coluna dos quadros a 0.75rem em `text-muted`.

### Named Rules
**The Tabular Rule.** Todo número de carga, repetição, data e contagem usa o utilitário `num` (`tabular-nums lining-nums`) para que as colunas dos quadros alinhem dígito a dígito.

**The Heavy Sign Rule.** Placas e letras falam em 800 a 900; corpo fica em 400 a 700. Não existe peso leve no sistema.

## Layout

Coluna única central de no máximo 480px, com calha lateral de 16px. A placa amarela e as linhas de aviso sangram até a borda da coluna (margem negativa igual à calha). O cabeçalho da página tem 20px abaixo; seções ficam a 32px uma da outra; listas usam espaçamento de 8px e o conteúdo de linha, 12px.

Quadros de partidas usam grids de colunas fixas (quadrado da letra, rótulo flexível, valor, distância em dias) com linhas separadas por fio de 1px. No Resumo as linhas têm no mínimo 56px; no Histórico o grid é data, letra, treino, séries e duração, com o nome do treino quebrando em até duas linhas (0.9375rem, entrelinha justa) em vez de cortar. Linhas tocáveis têm no mínimo 44px, ações principais 56px.

Toda lista e gráfico de consulta (Histórico, Progresso, Exercício, Resumo da Início) mora num quadro de partidas; não há lista de consulta solta na página nem gráfico separado só por um fio.

A barra inferior é fixa, preta, com quatro abas em grid; a página reserva 96px no rodapé para ela. Na sessão ativa a barra some e dá lugar a uma barra preta de ação (sair e finalizar), e a placa amarela fica fixa no topo com o exercício e a série da vez. Folhas (Modal) sobem do rodapé até 85% da altura. Todas as bordas inferiores respeitam a área segura do aparelho.

## Elevation & Depth

Sistema chapado, sem nenhuma sombra. Profundidade vem de três recursos: o contraste entre preto de placa, moldura e quadrado preto; a inversão de tinta para estados; e as molduras de 2px (4px no topo das folhas). O véu atrás das folhas é preto a 70%.

### Named Rules
**The Flat Plate Rule.** Placas são impressas, não flutuam. Nada de `box-shadow`, gradiente ou desfoque; se algo precisa se destacar, troca de tinta ou ganha moldura.

## Shapes

Formas retas de sinalização. Três raios, todos pequenos: 2px nos segmentos internos de controles segmentados e em barras de gráfico, 3px nos tiles, quadrados de saguão, linhas de série e controles pequenos, 4px em botões, quadros emoldurados e toast. A placa amarela de borda a borda não tem raio.

Molduras são de 2px em `edge` para quadros, placas emolduradas, segmentados, botões `outline` e filtros de letra; divisórias internas são de 1px em `border`. O "adicionar exercício" usa moldura tracejada de 2px.

A anatomia da placa: a seta de caminho fica presa à borda do botão, num quadrado de 40px com contorno de 2px na cor do texto, à frente do rótulo (`ArrowLead`).

### Named Rules
**The Four Pixel Ceiling.** Nenhum raio passa de 4px.

## Components

### Buttons
Tátil e direto, como um painel de botões de terminal.
- **Shape:** cantos quase retos (4px), peso 600.
- **go:** amarelo de sinalização com texto preto, 56px de altura, 1.125rem. O próximo passo do caminho (Iniciar, Finalizar). Hover escurece 5%, ativo 10%.
- **ink:** quadrado preto com texto branco, 56px. Usado dentro da placa amarela (Iniciar treino, Continuar sessão), com a seta presa à borda e o rótulo alinhado à esquerda.
- **onInk:** contorno branco a 45% de 2px sobre a barra preta, 56px; ação que ainda não é o próximo passo.
- **solid:** tinta invertida do tema, 48px; confirmação em diálogo.
- **outline:** moldura de 2px em `edge`, 48px; ação secundária. Hover em `surface-2`.
- **quiet:** sem fundo, 44px, 0.875rem em `text-muted`; ação pequena de linha.
- **Disabled:** 40% de opacidade, sem ponteiro.
- **Focus:** contorno de 3px em `focus`, afastado 2px; preto sobre a placa amarela.

### Tiles
- **Tile:** quadrado preto com pictograma Lucide (traço 2.5) ou número em branco, peso 700, tabular. Tamanhos 36, 44 e 56px. Variante invertida (`text` sobre `bg`) para estado feito. Botão "voltar" do cabeçalho é um tile de 44px.
- **LetterTile:** a letra do treino em branco sobre a cor de saguão, mesmos tamanhos.

### Quadros de partidas (boards)
O recipiente comum de toda consulta: linhas do Histórico, séries iniciais e sessões do Exercício, barras de músculo e lista de exercícios do Progresso, cada gráfico e o Resumo da Início.
- **Corner Style:** 4px.
- **Background:** `surface`.
- **Border:** moldura de 2px em `edge`; linhas separadas por fio de 1px em `border`, sem fio na última; rodapé de totais separado por 2px em `edge`.
- **Internal Padding:** 12px na horizontal para listas, 12px em volta nos gráficos.
- Rótulos de coluna pequenos em `text-muted`, valores em 700 e tabulares. Contadores de rodapé empilham rótulo sobre valor.
- **Estado vazio:** a mensagem fica dentro do próprio quadro (primeira execução, período sem dados), nunca no lugar dele.

### Gráficos
Cada gráfico é um quadro de partidas: título em 1.125rem/700 e nota em `text-muted` na legenda, área de 176px, grade só horizontal em fio contínuo, ticks dos eixos em `text-muted` a 12px. Pontos e barras na cor de saguão do treino, linha em `text`, tooltip em quadrado preto. Tabela dos valores disponível num `details` abaixo.

### Named Rules
**The Board Rule.** Consulta se lê num quadro de partidas: toda lista e todo gráfico de Histórico, Progresso, Exercício e Resumo ficam dentro de um quadro emoldurado de 2px em `edge` sobre `surface`, raio de 4px, com linhas separadas por fio de 1px.

### Placa amarela (signature)
Bloco amarelo de borda a borda no topo das telas de decisão. Na Início: letra a 8rem em 900, nome do treino em 800, detalhe em `on-sign-muted`, botão `ink` com seta. Na Sessão: cabeçalho fixo com tile de voltar, nome do treino, contagem de séries e uma linha separada por fio preto a 15% com o exercício e a série da vez. A mensagem troca com o utilitário `flap`.

### Inputs / Fields
- **Style:** campos centrados, transparentes, tinta herdada da linha (`currentColor`), raio de 3px, 48px de altura, números tabulares. Carga a 1.375–1.75rem em 700; repetições a 1.125rem em 600 com contorno de 2px a 25% da tinta.
- **Focus:** o contorno sobe para 40–60% da tinta, mais o anel de foco global.
- Passos de +/- são botões de 44x48px sem fundo, com hover a 10% da tinta.

### Linha de série
Linha com raio de 3px. A série da vez fica em `surface-2` com o ✓ em quadrado amarelo de 48px; série registrada inverte a tinta e mostra o ✓ sem caixa; séries futuras têm ✓ em contorno de 2px a 30%.

### Segmented / ProgramTabs / LetterFilter
- **Segmented e ProgramTabs:** moldura de 2px em `edge`, raio de 4px, 2px de respiro interno; segmentos de 44px com raio de 2px; o atual em tinta invertida, os outros em `text-muted`.
- **LetterFilter:** botões separados de 44px com moldura de 2px; o treino selecionado acende na cor de saguão com letra branca, "Todos" selecionado em tinta invertida.

### Navigation
Barra inferior preta fixa, quatro abas de 56px com ícone (22px) e rótulo (0.8125rem, 600). A aba ativa é o bloco amarelo ("você está aqui") com ícone em traço 2.5; as inativas em branco a 70%.

### Modal (folha inferior)
Sobe do rodapé, largura da coluna, fundo `surface`, borda superior de 4px em `edge`, sem raio. Título em 1.375rem/700; rodapé de botões separado por fio de 1px.

### Toast
Quadrado preto de 56px com raio de 4px, texto branco 600 e a ação ("Desfazer") em botão amarelo de 48px encostado à direita. Entra com `flap`, dura 5s.

### Motion
Um único gesto: `flap` (keyframe de `rotateX(-70deg)` com perspectiva de 400px e opacidade 0.2 até o lugar, 140ms, `cubic-bezier(0.16, 1, 0.3, 1)`, origem no topo). Usado na letra da placa, na linha da série da vez e no toast. Transições de cor duram 150ms. Com `prefers-reduced-motion` toda animação e transição vai a 0ms.

## Do's and Don'ts

### Do:
- **Do** reservar `sign` (#FFCC00) para o caminho: próxima ação, série da vez, aba atual.
- **Do** começar linhas de lista com um tile preto (pictograma ou número branco) ou com o quadrado de saguão do treino.
- **Do** emoldurar quadros e placas secundárias com 2px em `edge` e separar linhas internas com 1px em `border`.
- **Do** colocar toda lista e gráfico de consulta, e seu estado vazio, dentro de um quadro de partidas.
- **Do** aplicar `num` a todo número exibido ou editável.
- **Do** mostrar estado por inversão de tinta (`bg-text text-bg`).
- **Do** manter alvos de toque em 44px ou mais e ações principais em 56px.
- **Do** usar `flap` para trocar a mensagem da placa, com no máximo 150ms, e nenhum movimento sob `prefers-reduced-motion`.

### Don't:
- **Don't** usar amarelo como decoração, cor de gráfico, erro ou destaque genérico.
- **Don't** usar as cores de saguão para ações ou estados; elas só identificam A, B e C.
- **Don't** passar de 4px de raio nem voltar aos cartões arredondados iguais da versão anterior.
- **Don't** usar sombras, gradientes ou desfoque para dar profundidade.
- **Don't** deixar lista ou gráfico de consulta solto na página, nem usar grade tracejada em gráfico.
- **Don't** trocar a Source Sans 3 Variable por fonte sem algarismos tabulares ou carregada de CDN em runtime.
