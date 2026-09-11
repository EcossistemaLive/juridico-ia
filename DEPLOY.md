# Deploy e infraestrutura — Jurídico IA

Duas peças com deploys independentes:

```
GitHub Pages (estático)              Cloud Functions (southamerica-east1)
┌──────────────────────┐   HTTPS     ┌──────────────────────────────────┐
│ Next.js output:export│ ──────────► │ parseFile · analisar · planejar  │
│ Firebase Auth (SDK   │  Bearer     │ redigir · revisar                │
│ cliente) + Firestore │  ID token   │ ANTHROPIC_API_KEY vive só aqui   │
└──────────────────────┘             └──────────────────────────────────┘
          │                                        │
          └────────────── Firestore ───────────────┘
                    (regras por escritório)
```

## Por que não dá para colocar tudo no Pages

O GitHub Pages serve arquivos estáticos. Não há servidor. Se as chamadas à
Anthropic saíssem do navegador, a `ANTHROPIC_API_KEY` estaria no bundle —
extraível por qualquer usuário logado, com a conta aberta para quem quisesse
gastar. Pelo mesmo motivo o `verifyIdToken` do Admin SDK não pode rodar no
cliente: quem verifica o token não pode ser quem o apresenta.

Então: front no Pages, cérebro nas Functions. O Firestore é o ponto de encontro.

---

## 1. Firebase

1. Crie o projeto (sugestão: `juridico-ia-live`) e o Firestore em
   **southamerica-east1**. Ajuste `.firebaserc` com o id real.
2. **Plano Blaze** (pay as you go). Cloud Functions de 2ª geração exige. A cota
   gratuita cobre folgadamente o piloto; o custo relevante do produto são os
   tokens da Anthropic, não a execução.
3. Authentication → habilite **E-mail/senha**. Em *Authorized domains*, acrescente
   o domínio do Pages (`seu-usuario.github.io` ou o domínio próprio).
4. Publique regras e índices:
   ```bash
   firebase deploy --only firestore
   ```
5. A coleção `ratelimits` usa TTL pelo campo `expiraEm` — o
   `firestore.indexes.json` já declara. Confirme no console que a política de TTL
   ficou ativa; sem ela, a coleção cresce para sempre.

## 2. Secrets e variáveis das Functions

```bash
firebase functions:secrets:set ANTHROPIC_API_KEY
```

E `functions/.env` (não versionado) com as origens do CORS:

```
ORIGENS_PERMITIDAS="https://seu-usuario.github.io,https://juridico.seudominio.com.br"
```

`localhost:3000` já é permitido por padrão, para o desenvolvimento.

Não é preciso configurar credencial do Admin SDK: dentro das functions ela é
automática.

## 3. Publicar o backend

```bash
npm --prefix functions install
npm --prefix functions run build:base   # gera a base jurídica por área
firebase deploy --only functions
```

A URL sai no formato
`https://southamerica-east1-<projeto>.cloudfunctions.net/<funcao>`.
Guarde a parte antes do nome da função: é o `NEXT_PUBLIC_API_BASE_URL`.

## 4. Publicar o front

Primeiro, copie os workflows para o lugar em que o GitHub os lê:

```bash
mkdir -p .github/workflows
cp deploy/workflows/*.yml .github/workflows/
```

Eles ficam versionados em `deploy/workflows/` porque ferramentas remotas não
podem escrever em `.github/workflows/` — proteção do GitHub contra alteração de
pipeline por automação.

Depois, no repositório: **Settings → Pages → Source: GitHub Actions**.

Em **Settings → Secrets and variables → Actions → Variables**, defina:

| Variável | Exemplo |
|---|---|
| `NEXT_PUBLIC_BASE_PATH` | vazio para domínio próprio, `/juridico-ia` para project site |
| `NEXT_PUBLIC_API_BASE_URL` | `https://southamerica-east1-juridico-ia-live.cloudfunctions.net` |
| `NEXT_PUBLIC_FIREBASE_API_KEY` … `_APP_ID` | do console do Firebase |

Em **Secrets**, para o workflow das functions:

| Secret | O que é |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | JSON da conta de serviço com papel de deploy |

Um `git push` na `main` dispara os workflows. Alterações em `functions/` publicam
o backend; o resto publica o front.

### O detalhe que derruba o site silenciosamente

O Pages passa o conteúdo pelo Jekyll, que ignora pastas iniciadas por `_`. O Next
escreve tudo em `_next/`. Sem um arquivo `.nojekyll` na raiz do que é publicado, o
site sobe **sem CSS e sem JavaScript**, e o erro não aparece em lugar nenhum. O
workflow já cria o arquivo; `public/.nojekyll` também está versionado.

## 5. Coleções

```
users        perfil e vínculo com escritório (papel real vem das custom claims)
escritorios  configuração do tenant: overlays de foro e estilo, plano, limites
cases        caso: partes, polo, área, rito, comarca, número CNJ, tese central
documents    documentos dos autos, metadados
analyses     saída do doc-analyst (registro imutável do que a IA produziu)
petitions    minutas e versões, com estado de revisão humana
templates    biblioteca de modelos e teses do escritório
audit        trilha de acesso — gravada só pelo servidor
ratelimits   janelas de contagem, com TTL
```

## 6. Custom claims — o bootstrap

Papel e escritório vivem nas claims, não no código. O primeiro admin é gravado
uma vez, por script, com `GOOGLE_APPLICATION_CREDENTIALS` apontando para o JSON
da conta de serviço:

```bash
node scripts/bootstrap-admin.mjs <uid> mlp "MLP Advogados"
```

Depois disso o usuário precisa renovar o token (`getIdToken(true)`) para as
claims valerem — senão leva 403 sem entender por quê.

Papéis previstos: `plataforma_admin`, `admin`, `advogado`, `secretaria`.

## 7. Desenvolvimento local

```bash
npm install
npm run build:catalogo
npm run dev                                   # front em localhost:3000

npm --prefix functions install
npm --prefix functions run serve              # emulador das functions
```

Aponte `NEXT_PUBLIC_API_BASE_URL` para o emulador
(`http://127.0.0.1:5001/<projeto>/southamerica-east1`) no `.env.local`.

## 8. O que mudou em relação ao RecrutaAI

| Item | RecrutaAI | Aqui |
|---|---|---|
| Hospedagem | Netlify (SSR) | GitHub Pages (estático) + Cloud Functions |
| Rotas de API | `src/app/api/*` | `functions/index.js` |
| Chave da IA | env do Netlify | secret do Firebase |
| Credencial Admin | chave privada em env | automática dentro das functions |
| Rate limit | `Map` em memória | contagem no Firestore com TTL |
| Isolamento | por usuário | por escritório |
| Papel do usuário | e-mail no código | custom claims |
| Rotas dinâmicas | `[id]` com SSR | query string (`?id=`) — exigência do export estático |
