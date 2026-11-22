# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

O dono do projeto e alguns amigos próximos, que recebem o link. Cada pessoa usa o app no próprio
celular, sozinha, dentro da academia: entre uma série e outra, com uma mão, muitas vezes offline.
Fora da academia, abre para revisar progresso e histórico.

## Product Purpose

Registrar treinos de musculação na divisão ABC contínua e mostrar a progressão por exercício.
Sucesso é registrar cada série em segundos (1 toque quando a carga repete a da última vez), saber
qual treino vem a seguir pela sequência real e enxergar se a carga está subindo.

## Positioning

Divisão ABC contínua sem calendário: o próximo treino vem da sequência real, não do dia da semana.
Repetições são opcionais e aproximadas; carga e falha são os dados principais. Cada slot do treino
tem alternativas trocáveis só naquela sessão. Tudo fica no aparelho, sem conta nem nuvem.

## Operating Context

- Academia com iluminação que varia muito (forte, perto de janela, ou baixa e amarelada): os dois
  temas, escuro e claro, precisam ser bons de verdade. Tema escuro é o padrão (SPEC).
- Uso com uma mão, entre séries, tela com brilho variável; números de carga precisam ser legíveis
  de relance.
- Revisão de histórico e gráficos acontece com mais calma, fora da academia.

## Capabilities and Constraints

- PWA instalável e offline; dados locais (IndexedDB) com backup/importação em JSON.
- Interface em pt-BR, unidades em kg.
- Treinos A, B e C, cada um com uma cor própria usada de forma consistente em cards, histórico e
  gráficos (SPEC §7).
- Alvos de toque ≥ 44px; ações principais da sessão na metade inferior da tela; transições ≤ 150ms;
  contraste AA; números tabulares para cargas e repetições.
- Fora de escopo: login, nuvem, timer de descanso, medidas corporais, notificações, IA.
- Fonte única de verdade funcional: `docs/SPEC.md`.

## Brand Commitments

- Nome: "Treino ABC". Sem logo ou identidade visual definida.
- O visual anterior foi rejeitado por parecer gerado por IA: cards arredondados iguais em toda
  parte, cores chapadas sobre fundo quase preto, tipografia genérica de sistema e telas sem nada
  que lembre treino. Nenhum desses traços deve voltar como padrão.

## Evidence on Hand

- Programa real do usuário (treinos A/B/C, exercícios, séries) em `docs/SPEC.md` §4 e
  `src/data/seedProgram.ts`.
- Sem fotos, depoimentos ou marca. Imagens de exercícios virão do free-exercise-db (domínio
  público) na Fase 7.

## Product Principles

1. Registro em segundos vence qualquer enfeite na tela da sessão.
2. A carga é o número mais importante da tela; repetições são secundárias e opcionais.
3. A sequência real manda: nada reinicia na segunda-feira.
4. Os dados são do usuário: locais, exportáveis, sem conta.
5. Informar, não prescrever: avisos e tendências descrevem, não mandam.

## Accessibility & Inclusion

Contraste AA nos dois temas, foco visível, rótulos em todos os controles, identidade de treino
nunca só por cor (letra sempre visível junto da cor).
