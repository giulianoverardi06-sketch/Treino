# Treino ABC

App pessoal (PWA) para registrar treinos de musculação em rotação contínua (2 a 5 treinos, A a E):
o próximo treino vem da sequência real, cada série é registrada em segundos e a progressão aparece
por exercício. Cardio avulso (tempo, distância, intensidade) fica ao lado, fora da rotação.
Tudo fica no aparelho, com backup em JSON.

- Especificação: [docs/SPEC.md](docs/SPEC.md)
- Produto e visual: [PRODUCT.md](PRODUCT.md), [DESIGN.md](DESIGN.md)
- Imagens dos exercícios: [docs/IMAGENS-REVISAO.md](docs/IMAGENS-REVISAO.md)

## Rodar

```
npm install
npm run dev        # desenvolvimento
npm test           # testes
npm run build      # build de produção em dist/
npm run preview    # serve o build (o service worker só roda no build)
```

## Publicar

O build é estático (rotas com hash, caminhos relativos), então serve em qualquer hospedagem
estática. Instalar como app e abrir offline exige HTTPS.

**GitHub Pages** (workflow pronto em `.github/workflows/deploy.yml`):

1. Crie um repositório no GitHub e envie este projeto (`git remote add origin …` e `git push -u origin main`).
2. No repositório: Settings → Pages → Source: **GitHub Actions**.
3. Cada push na `main` roda lint, testes e build e publica em `https://<usuário>.github.io/<repositório>/`.

**Vercel**: importe o repositório; o preset Vite já detecta `npm run build` e a pasta `dist`.

## Instalar no celular

- Android (Chrome): abra o endereço publicado → menu ⋮ → **Instalar app**.
- iPhone (Safari): abra o endereço → Compartilhar → **Adicionar à Tela de Início**.

Depois da primeira visita, o app abre sem internet.

## Créditos

Imagens: [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (domínio público).
