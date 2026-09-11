# Workflows do GitHub Actions

Copie os dois arquivos desta pasta para `.github/workflows/` antes do primeiro push:

```bash
mkdir -p .github/workflows
cp deploy/workflows/deploy-pages.yml deploy/workflows/deploy-functions.yml .github/workflows/
```

Ficam aqui porque ferramentas remotas não têm permissão de escrever em
`.github/workflows/` — é uma proteção do próprio GitHub contra alteração de
pipeline por automação. Copiar à mão é intencional: quem publica é você.

## deploy-pages.yml
Build estático do Next (`output: "export"`) e publicação no GitHub Pages.
Dispara em push na `main`, ignorando mudanças em `functions/`, `referencias/` e `*.md`.

Antes do primeiro run: **Settings → Pages → Source: GitHub Actions**, e as
*Repository variables* listadas em `DEPLOY.md` §4.

## deploy-functions.yml
Gera a base jurídica, autentica no Google Cloud e publica functions e regras do
Firestore. Dispara em push que toque `functions/`, `firebase.json`,
`firestore.rules` ou a base doutrinária.

Antes do primeiro run: secret `FIREBASE_SERVICE_ACCOUNT` com o JSON da conta de
serviço, e a variable `FIREBASE_PROJECT_ID`.
