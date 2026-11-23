# Imagens do seed: revisão humana

Fonte: [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (domínio público / Unlicense).
Mapeamento em `src/data/seedImageMap.ts`, proposto por busca de nome e equipamento no índice
(`src/data/exerciseDbIndex.json`, 876 exercícios). Nenhum id foi inventado: todos existem no índice.

Fotos usadas no seed ficam em `public/exercise-images/<dbId>/0.jpg` e `1.jpg` (reduzidas para
600px de largura e recomprimidas; 74 arquivos, ~2,5 MB). Para atualizar:

```
node scripts/fetch-exercise-db.ts --images
```

O script baixa as fotos originais (~850px). Depois, reduzir para 600px e recomprimir (PowerShell):

```
Get-ChildItem public\exercise-images -Recurse -File | ForEach-Object { $t = "$($_.FullName).tmp.jpg"; ffmpeg -loglevel error -y -i $_.FullName -vf "scale='min(600,iw)':-2" -q:v 6 $t; Move-Item -Force $t $_.FullName }
```

## Sem correspondência (placeholder + upload próprio)

| Exercício                   | Motivo                                       |
| --------------------------- | -------------------------------------------- |
| Elevação lateral na máquina | O banco não tem elevação lateral em máquina. |

## Correspondência média: conferir

| Exercício                           | Foto escolhida                      | O que pode não bater                                   |
| ----------------------------------- | ----------------------------------- | ------------------------------------------------------ |
| Supino inclinado na máquina         | Leverage Incline Chest Press        | Máquina de alavanca; a sua pode ser de cabo ou guiada. |
| Elevação lateral na polia           | Cable Seated Lateral Raise          | A foto é sentado; costuma ser feito em pé.             |
| Crossover médio                     | Cable Crossover                     | A foto é de cima para baixo, não na altura média.      |
| Extensão acima da cabeça com halter | Standing Dumbbell Triceps Extension | Em pé; se você faz sentado, a postura difere.          |
| Remada na máquina                   | Leverage Iso Row                    | Modelos de máquina variam.                             |
| Remada apoiada com pegada aberta    | Lying T-Bar Row                     | Remada T com peito apoiado; a pegada pode não bater.   |

Qualquer foto pode ser trocada no app: Biblioteca → exercício → Imagem (buscar no banco aberto,
enviar foto própria ou ficar sem imagem).

## Correspondência alta (31)

Mesmo movimento e equipamento. "Hack squat leve" usa a mesma foto do "Hack squat".
