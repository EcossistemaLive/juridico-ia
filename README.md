# Jurídico IA — Ecossistema Live

> SaaS de análise de documentos jurídicos e elaboração de peças, construído sobre
> o mesmo chassi do RecrutaAI: mesma interface, mesma autenticação, mesmo padrão
> de skills. O que muda é o cérebro — e a hospedagem, que aqui é GitHub Pages
> para o front e Cloud Functions para o backend.

---

## O que o sistema faz

**Modo 1 — Análise de documento e de processo.** Sobe o PDF dos autos (petição,
contestação, sentença, contrato, laudo) e recebe um parecer estruturado: triagem
de admissibilidade, prazos calculados, fatos com a prova e a folha de cada um,
teses com solidez avaliada, linha do tempo com contradições apontadas, matriz de
risco adversarial e o que falta nos autos.

**Modo 2 — Elaboração de peça.** A partir do caso e da análise, primeiro o plano
(silogismo central, cobertura dos elementos por pedido, hierarquia das teses,
bloqueios) para o advogado validar; depois a redação em streaming, na voz do
escritório, com marcação explícita de tudo que faltou.

**Revisão adversarial.** Audita uma peça pronta como faria a parte contrária:
checklist formal em código, achados priorizados por gravidade, e um veredito de
apto ou não apto para protocolo.

Em nenhum momento o sistema decide, assina ou protocola. A saída é sempre minuta
com estado de revisão pendente.

---

## Como está construído

Duas peças com deploys independentes. O front é estático; o cérebro roda em
Cloud Functions, único lugar onde a chave da Anthropic existe.

```
/                             FRONT — estático, GitHub Pages
├── src/
│   ├── app/
│   │   ├── dashboard/        casos · documentos · peticoes · biblioteca
│   │   ├── login/ onboarding/ pending-approval/   herdados do RecrutaAI
│   │   └── globals.css       mesmos tokens, paleta a ajustar
│   ├── components/common/    GlassCard, StatCard, PageHeader, UploadProgress
│   ├── context/AuthContext.js
│   ├── lib/
│   │   ├── firebase.js       SDK cliente — só no navegador
│   │   ├── api.js            cliente HTTP das functions (token + streaming)
│   │   └── catalogo.js       GERADO: áreas e tipos de peça para os selects
│   ├── store/useCaseStore.js
│   └── utils/pieceDetection.js   heurística local, sem LLM
│
├── functions/                BACKEND — Cloud Functions, southamerica-east1
│   ├── index.js              parseFile · analisar · planejar · redigir · revisar
│   ├── lib/
│   │   ├── firebase-admin.js Admin SDK, credencial automática
│   │   ├── auth-middleware.js verifyIdToken de verdade
│   │   ├── caso-loader.js    contexto do caso, com checagem de escritório
│   │   ├── rate-limiter.js   contagem no Firestore (não em memória)
│   │   ├── prazos.js         dias úteis, em código
│   │   ├── validation.js     schemas Zod da borda
│   │   └── cors.js           origens explícitas, nunca "*"
│   └── skills/               O CÉREBRO
│       ├── claude-client/    API Anthropic
│       ├── base-juridica/    doutrina por área (contexto cacheável)
│       ├── doc-analyst/      Modo 1 + revisão
│       ├── petition-drafter/ Modo 2 + catálogo de peças
│       └── overlays/         pacote de foro + pacote de estilo
│
├── referencias/              material de origem (ver CREDITOS-E-LICENCAS.md)
├── scripts/
│   ├── gerar-catalogo.mjs    functions/skills → src/lib/catalogo.js
│   └── bootstrap-admin.mjs   grava as custom claims do primeiro admin
└── .github/workflows/        deploy-pages.yml · deploy-functions.yml
```

O princípio herdado do RecrutaAI e preservado: **a inteligência mora em `skills/`,
atrás de uma fachada**. Nenhuma function importa o motor diretamente.

O que mudou de propósito: as rotas de API do Next viraram functions, porque
GitHub Pages não tem servidor. A regra que decide a arquitetura inteira é que a
chave da Anthropic nunca pode chegar ao navegador.

---

## As quatro regras que definem o produto

1. **Nunca inventar.** Fato só do material; lei só da base anexada; jurisprudência
   só do que foi recuperado nesta requisição. Falta de dado vira
   `[DADO FALTANTE: ...]` no texto, nunca preenchimento plausível.
2. **O que é conta, é código.** Prazo, valor da causa e checklist formal se
   calculam em JavaScript. A IA lê a data; ela não conta os dias.
3. **Rastreabilidade.** Toda afirmação de fato aponta a folha. Com PDF nativo, as
   citações vêm ancoradas na origem pela própria API.
4. **Revisão humana obrigatória.** Toda saída nasce como minuta, com registro de
   quem revisou antes de liberar exportação.

---

## Rodando

```bash
cp .env.example .env.local            # preencha as chaves públicas do front
npm install
npm run build:catalogo                # gera src/lib/catalogo.js
npm run dev                           # front em localhost:3000

npm --prefix functions install
cp functions/.env.example functions/.env
npm --prefix functions run build:base # gera a base jurídica por área
npm --prefix functions run serve      # emulador das functions
```

Infra, coleções, claims e índices: [DEPLOY.md](DEPLOY.md).
Origem do método e situação de licença de cada fonte: [CREDITOS-E-LICENCAS.md](CREDITOS-E-LICENCAS.md).
Estado de cada frente e o que falta: [PENDENCIAS.md](PENDENCIAS.md).

---

## Aviso

Este sistema é instrumento de apoio a profissional habilitado. Não presta
consultoria jurídica, não substitui o exame dos autos, não substitui a conferência
das fontes em suas origens oficiais e não substitui o juízo do advogado, a quem
cabem, com exclusividade, a decisão técnica, a assinatura da peça e a
responsabilidade profissional correspondente (Lei 8.906/1994 e Código de Ética e
Disciplina da OAB).
