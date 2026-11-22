---
version: 1
slug: "src-app-applayout-tsx"
primary_target: "src/app/AppLayout.tsx"
related_targets: ["src/features"]
---

# App Treino ABC (todas as telas)

Modo: Operate. Usuário: dono do app e amigos, celular numa mão, entre séries, luz da academia variável.
Tarefa: registrar séries em segundos, saber o próximo treino, revisar progresso.
Restrições: SPEC §7 (alvos ≥44px, ações da sessão na metade de baixo, transições ≤150ms, AA, números tabulares, uma cor por treino), PWA offline (fonte empacotada, sem Google Fonts em runtime).

## Direction contract

THESIS: o próximo passo está sempre sinalizado. Cada tela de decisão (Início e Sessão) tem uma placa amarela que diz a próxima decisão (o próximo treino, a série da vez); as telas de consulta (Histórico, Progresso, Exercício) leem como quadros de partidas emoldurados; o resto é sequência numerada em quadrados pretos. Recusa os cartões arredondados iguais e o tema escuro com acentos chapados que vieram antes.

OWN-WORLD: amarelo de sinalização #FFCC00 reservado para caminho e próxima ação; preto de placa #0B0B0B, moldura #1A1A1A, cinza de superfície #E6E6E6, branco de pictograma. Treinos A/B/C como quadrados de saguão (vermelho, azul, verde-azulado validados) com a letra em branco. Source Sans 3 Variable, humanista de sinalização empacotada para uso offline (Signika foi descartada por não ter algarismos tabulares, exigidos pelo SPEC §7), em 800–900 para placas e letras e com números tabulares. Quadrados pretos com pictograma ou número branco à esquerda de cada linha; bordas retas de 2px, raio ≤4px; setas presas à borda da placa.

STORY: abre o app e lê na placa a letra do próximo treino em escala monumental e há quantos dias foi o último; toca Iniciar; na sessão, a placa fixa diz o exercício e a série da vez, o ✓ amarelo confirma; finaliza; histórico e progresso leem como quadros de partidas, linha a linha.

FIRST VIEWPORT: Início em 390px. Título "Treino ABC" com engrenagem à direita. Placa amarela de borda a borda: letra a 128px em 900, nome do treino e "último há N dias", botão preto "Iniciar treino B" com a seta em quadrado na frente do rótulo, dentro da placa. Aviso de sobreposição como linha com quadrado "!" logo abaixo. "Outros treinos": duas placas emolduradas (2px) com o quadrado da letra. Resumo como quadro de partidas emoldurado (letra | última data | há N dias), com estado vazio na primeira vez. Barra inferior preta; aba ativa em bloco amarelo.

FORM: desafiante fundido wayfinding-cartography-signage-terminal-yellow-wayfinding (competitivo, escolhido pelo usuário; fora da lista própria). seed:3b4d590641632a51. Movimento assinatura: a placa amarela troca a mensagem como painel split-flap (≤150ms; nenhum movimento com prefers-reduced-motion).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
