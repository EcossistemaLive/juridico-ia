# Walkthrough — continuar o Jurídico IA no Antigravity

Documento de passagem de bastão. Escrito para ser lido por você **e** pelo agente
do Antigravity antes de escrever a primeira linha. Se você só tem cinco minutos,
leia a seção 1 e a seção 10.

Estado na entrega: commit inicial `ba13f1d`, 108 arquivos versionados.
Pasta: `D:\Automacao\Consultoria\clientes\ecossistema-live\produtos\juridico-ia`

---

## 1. O que existe e o que falta

### Existe e está pronto

| Camada | Onde | Situação |
|---|---|---|
| Autenticação e conta | `src/context/AuthContext.js`, `src/app/login`, `onboarding`, `pending-approval` | herdado do RecrutaAI, funciona |
| Layout e navegação | `src/app/dashboard/layout.js`, `src/components/common/*` | herdado, trocar rótulos e marca |
| Cliente das functions | `src/lib/api.js` | escrito: token, erros traduzidos, leitura de stream |
| Catálogo da UI | `src/lib/catalogo.js` | gerado do cérebro por `npm run build:catalogo` |
| Auth do backend | `functions/lib/auth-middleware.js`, `firebase-admin.js` | reescrito, `verifyIdToken` real, credencial automática |
| Banco | `firestore.rules`, `firestore.indexes.json` | isolamento por escritório, TTL do rate limit |
| Cérebro | `functions/skills/*` | escrito, **nunca executado contra a API** |
| Functions | `functions/index.js` | 5 funções escritas, **nunca implantadas** |
| Deploy | `.github/workflows/*` | dois workflows, nunca rodados |

### Falta

1. **Nada foi executado ainda.** `npm install` não rodou, nenhuma function foi
   implantada, nenhuma chamada à Anthropic aconteceu. O passo 5 existe para isso.
2. **As telas de domínio não existem**: `casos`, `documentos`, `peticoes`, `biblioteca`.
3. Seis bloqueadores de produção, listados em `PENDENCIAS.md`.
4. `src/middleware.js` provavelmente ainda existe e **precisa ser apagado**:
   middleware não funciona em export estático.

---

## 2. Ordem de leitura

Leia nesta ordem. Não pule o terceiro item — ele é o que impede retrabalho jurídico.

| # | Arquivo | Por que |
|---|---|---|
| 0 | `AGENTS.md` | as regras que o agente precisa seguir aqui — leia primeiro |
| 1 | `README.md` | o que o sistema faz e o mapa de pastas |
| 2 | `ARQUITETURA.md` | por que está construído assim; o mapeamento RecrutaAI → jurídico |
| 3 | `CREDITOS-E-LICENCAS.md` | **o que não pode ser incorporado.** Um repositório AGPL entrando aqui obriga a abrir o código do produto inteiro |
| 4 | `PENDENCIAS.md` | o que falta, com os bloqueadores separados do resto |
| 5 | `DEPLOY.md` | Firebase, coleções, claims, índices, Netlify |
| 6 | `.antigravity/rules.md` | o resumo das regras, carregado em toda sessão do Antigravity |

### Material de referência dentro do repo

`referencias/` não é código do produto — é a origem do método, mantida para
consulta e para o gerador da base jurídica. Vale abrir quando for mexer no cérebro:

- `referencias/advocacia-aberta/skills/3.1-redigir-peca/SKILL.md` — o método de duas
  fases que o `petition-drafter` implementa
- `referencias/advocacia-aberta/skills/4.1-revisar-peca/SKILL.md` — a disciplina de
  revisão por inventário de referências
- `referencias/advocacia-aberta/SIGILO-E-DADOS.md` — a política que orientou o
  isolamento por escritório
- `referencias/themis-skills/skills/pleading-qc-and-risk-audit/SKILL.md` — de onde
  vieram a linha do tempo e a superfície de ataque
- `referencias/themis-skills/skills/overlay-jurisdiction-pleadings/references/JURISDICTION_PACK_TEMPLATE.md`
  — o modelo do pacote de foro
- `referencias/sistema-de-peticoes/prompts/prompt_peticao.md` — a regra anti-invenção
  na forma original
- `referencias/sistema-de-peticoes/core/redaction.py` — o mascaramento de PII que
  ainda precisa ser portado (bloqueador 2)
- `referencias/advogado-especialista/SKILL.md` — a fonte da base doutrinária

### Documentação externa

Cérebro (Anthropic):
- Modelos e preços — https://platform.claude.com/docs/en/about-claude/models/overview
- Suporte a PDF — https://platform.claude.com/docs/pt-BR/build-with-claude/pdf-support
- Files API — https://platform.claude.com/docs/pt-BR/build-with-claude/files
- Prompt caching — https://platform.claude.com/docs/en/build-with-claude/prompt-caching
- Streaming — https://platform.claude.com/docs/en/build-with-claude/streaming
- Tool use (é assim que sai o JSON estruturado) — https://platform.claude.com/docs/en/agents-and-tools/tool-use

Plataforma:
- Firebase Admin SDK — https://firebase.google.com/docs/admin/setup
- Custom claims — https://firebase.google.com/docs/auth/admin/custom-claims
- Regras do Firestore — https://firebase.google.com/docs/firestore/security/get-started
- Route handlers do Next — https://nextjs.org/docs/app/building-your-application/routing/route-handlers
- Plugin Next no Netlify — https://docs.netlify.com/frameworks/next-js/overview/

---

## 3. A arquitetura em uma tela

Antes dos passos, entenda por que há duas peças:

```
GitHub Pages (estático)          Cloud Functions (southamerica-east1)
Next output:export        HTTPS  parseFile · analisar · planejar
Firebase Auth (cliente)  ──────► redigir · revisar
                    Bearer token ANTHROPIC_API_KEY + Admin SDK
        │                                   │
        └──────────── Firestore ────────────┘
                (regras por escritório)
```

GitHub Pages serve arquivos estáticos: não há servidor. Se a chamada à Anthropic
saísse do navegador, a chave estaria no bundle — extraível por qualquer usuário
logado. Por isso o cérebro vive em `functions/`, e é o único lugar com a chave e
com o Admin SDK.

---

## 4. Passo a passo da estruturação

### Passo 0 — Pré-requisitos

- Node 20.x (os workflows fixam 20.12.0 — use a mesma versão local)
- Conta Anthropic com crédito e uma chave de API
- Projeto Firebase novo no **plano Blaze** (Functions de 2ª geração exige). Não
  reaproveite o projeto do RecrutaAI: aqui os dados são cobertos por sigilo
  profissional e não devem dividir projeto com outro produto.
- `npm install -g firebase-tools` e `firebase login`

### Passo 1 — Instalar

```bash
cd D:\Automacao\Consultoria\clientes\ecossistema-live\produtos\juridico-ia

npm install                              # front
npm run build:catalogo                   # gera src/lib/catalogo.js

npm --prefix functions install           # backend
npm --prefix functions run build:base    # gera a base jurídica por área
```

A saída esperada do `build:base`:

```
comum             10550 chars  ~2931 tokens
familia           12268 chars
empresarial        1188 chars
... (11 áreas)
```

Se `comum` sair com 0 chars, o fatiamento quebrou — veja a armadilha 1 na seção 10.
Os dois arquivos gerados (`src/lib/catalogo.js` e
`functions/skills/base-juridica/conteudo.js`) estão no `.gitignore`: rode os
comandos depois de todo clone.

### Passo 2 — Firebase

1. Crie o projeto e o Firestore em **southamerica-east1**. Ajuste o id em `.firebaserc`.
2. Authentication → habilite **E-mail/senha**. Em *Authorized domains*, acrescente
   o domínio do Pages.
3. Publique regras e índices:
   ```bash
   firebase deploy --only firestore
   ```
4. Confirme no console que a política de **TTL** ficou ativa na coleção
   `ratelimits`, campo `expiraEm`. Sem ela, a coleção cresce para sempre.

### Passo 3 — Secrets e CORS

```bash
firebase functions:secrets:set ANTHROPIC_API_KEY
```

E `functions/.env` (copie de `functions/.env.example`):

```
ORIGENS_PERMITIDAS="https://seu-usuario.github.io"
```

`localhost:3000` já é permitido por padrão. Sem essa variável, o front em
produção leva 403 na primeira chamada — e a mensagem no console do navegador vai
falar de CORS, não de configuração.

### Passo 4 — Publicar o backend e pegar a URL

```bash
firebase deploy --only functions
```

A URL sai como
`https://southamerica-east1-<projeto>.cloudfunctions.net/analisar`. A parte antes
do nome da função é o `NEXT_PUBLIC_API_BASE_URL` do front.

### Passo 5 — Provar o cérebro (antes de qualquer tela)

Nada do cérebro foi executado. Antes de investir em UI, prove que a chamada
funciona. Crie `functions/scripts/smoke.mjs` que:

1. carregue um PDF de exemplo em base64;
2. chame `analisarDocumento("Escritório Teste", { base64, mimeType: "application/pdf" }, { area: "civil" })`
   direto da skill, sem passar pela function;
3. imprima `triagem_admissibilidade`, `prazos_calculados` e `indicadores`.

Rode com `ANTHROPIC_API_KEY` no ambiente. O que confirmar:

- o `tool_use` volta preenchido (se vier vazio, algum campo do schema é inválido);
- os `localizacao` dos fatos trazem folha ou página, não "não consta";
- `prazos_calculados` traz `vencimento` e `diasRestantes`;
- o custo bate com o esperado (confira no console da Anthropic).

Só depois teste a function implantada, com token real.

### Passo 6 — Bootstrap do primeiro admin

Cadastre-se pelo app, pegue o `uid` no console do Firebase Auth e rode com
`GOOGLE_APPLICATION_CREDENTIALS` apontando para o JSON da conta de serviço:

```bash
node scripts/bootstrap-admin.mjs <uid> mlp "MLP Advogados"
```

O script grava as claims, o perfil em `users` e o documento em `escritorios`.
**Saia e entre de novo no app** — as claims só valem no token renovado.

### Passo 7 — Publicar o front

Os workflows estão em `deploy/workflows/` e precisam ser copiados à mão para
`.github/workflows/` — ferramenta remota não escreve nessa pasta, por proteção do
GitHub:

```bash
mkdir -p .github/workflows && cp deploy/workflows/*.yml .github/workflows/
```

No GitHub: **Settings → Pages → Source: GitHub Actions**. Em
**Settings → Secrets and variables → Actions → Variables**, defina
`NEXT_PUBLIC_BASE_PATH`, `NEXT_PUBLIC_API_BASE_URL` e as seis
`NEXT_PUBLIC_FIREBASE_*`. Em **Secrets**, `FIREBASE_SERVICE_ACCOUNT` com o JSON da
conta de serviço.

`git push` na `main` dispara os workflows. Detalhes e a armadilha do `.nojekyll`
estão em `DEPLOY.md`.

### Passo 8 — As telas, nesta ordem

Cada tela tem molde no RecrutaAI. Copie a estrutura, troque o domínio.

| Ordem | Tela | Molde no RecrutaAI | O que precisa ter |
|---|---|---|---|
| 1 | `dashboard/casos` | `dashboard/jobs/page.js` + `jobs/new/page.js` | lista, criação, ficha (partes, polo, área, rito, comarca, CNJ, tese central) |
| 2 | `dashboard/documentos` | `dashboard/candidates/page.js` | upload → `prepararConteudo` → confirmar detecção → `analisarDocumento` → parecer → histórico |
| 3 | `dashboard/peticoes` | `dashboard/jobs/[id]/page.js` | plano → validação → redação em streaming → editor → revisão → exportação |
| 4 | `dashboard/biblioteca` | `dashboard/jobs/page.js` | upload de modelos e teses, com área e tipo de peça |
| 5 | `dashboard/settings` | já herdado | abas do pacote de foro e do pacote de estilo |

Duas regras ao copiar:

- **Nada de rota `[id]`.** Export estático não resolve segmento dinâmico sem
  `generateStaticParams`, e ids de caso são dados de cliente. Use `?id=`.
- `dashboard/candidates/page.js` do RecrutaAI tem 1.633 linhas em um arquivo só.
  **Quebre em componentes** — é a dívida que o produto anterior pagou caro.

### Passo 9 — Parecer e exportação

- Parecer visual: adapte `skills/report-generator/index.js` do RecrutaAI (708
  linhas de HTML prontas). Scorecard dos 4 Pilares → Triagem de Admissibilidade;
  STAR → tabela fato/prova/folha; SWOT → matriz de risco.
- Exportação `.docx`: a dependência `docx` já está no `package.json` do front, e
  aqui roda no navegador mesmo — não precisa de servidor.
- **Regra de produto:** exportação só liberada com registro de revisão humana.

## 5. Contratos das functions

Base: `NEXT_PUBLIC_API_BASE_URL`. Todas são `POST`, exigem
`Authorization: Bearer <idToken>` e `Content-Type: application/json`.
Erros vêm como `{ error }` com 400, 401, 402, 403, 404, 415, 422, 429 ou 500.

Na prática você não monta essas chamadas à mão: use `src/lib/api.js`.

### `POST /parseFile`
Só DOCX, TXT e MD. **PDF não passa por aqui** — vai nativo para a análise.
```jsonc
// requisição
{ "nomeArquivo": "peca.docx", "base64": "..." }
// resposta
{ "texto": "...", "caracteres": 18422, "nomeArquivo": "peca.docx" }
```
A detecção de tipo de peça e de número CNJ roda **no navegador**, sobre o texto,
com `src/utils/pieceDetection.js`. Não custa chamada nenhuma.

### `POST /analisar` — Modo 1
```jsonc
{ "conteudo": { "base64": "...", "mimeType": "application/pdf" },  // ou a string de texto
  "area": "civil", "casoId": "abc123",
  "objetivo": "avaliar se cabe recurso" }
```
Resposta: `{ success: true, analise }` — `SCHEMA_ANALISE_PECA` mais o que o
`enriquecerAnalise` acrescenta: `prazos_calculados`, `prazo_mais_proximo`,
`indicadores` e `status_revisao`.

Teto de payload: 20 MB de PDF (base64 infla ~33%, e o limite da function é 32 MB).
Acima disso, divida os autos por seção.

### `POST /planejar` — Modo 2, fase 1
```jsonc
{ "tipoPeca": "contestacao", "area": "civil", "casoId": "abc123",
  "instrucoes": "sustentar prescrição como preliminar" }
```
Resposta: `{ success: true, plano }` (`SCHEMA_PLANO_PECA`). Se
`plano.pode_redigir === false`, a tela mostra os `bloqueios` e **não** libera o
botão de redigir.

O `caso-loader` busca sozinho, no servidor: o caso, a última análise, os overlays
de foro e estilo do escritório e até 5 modelos da área. Não mande nada disso do
cliente.

### `POST /redigir` — Modo 2, fase 2 (streaming)
Mesmo corpo do plano, mais `{ plano }`. Devolve **stream** de `text/plain`.
Use `redigirPeca(corpo, aoReceber)` do `src/lib/api.js`.

Falha no meio do stream não pode virar 500: o cabeçalho 200 já foi enviado. A
function escreve `[ERRO NA GERAÇÃO: ...]` no corpo e o cliente transforma em
exceção — assim o usuário não fica com uma peça truncada achando que acabou.

### `POST /revisar`
```jsonc
{ "texto": "peça completa", "tipoPeca": "contestacao", "area": "civil",
  "fontes": "legislação e jurisprudência conferidas, se houver" }
```
Resposta: `{ success: true, checklist, revisao }`. O `checklist` é determinístico
(rodou em código); a `revisao` veio do modelo. Exiba os dois — respondem
perguntas diferentes.

### Usando pelo front

```js
import { prepararConteudo, analisarDocumento, planejarPeca, redigirPeca } from "@/lib/api";

const { conteudo } = await prepararConteudo(file);      // PDF vira base64; DOCX vira texto
const { analise } = await analisarDocumento({ conteudo, area, casoId });

const { plano } = await planejarPeca({ tipoPeca, area, casoId });
const texto = await redigirPeca({ tipoPeca, area, casoId, plano }, (pedaco) => {
    setMinuta((atual) => atual + pedaco);                // a peça aparece enquanto sai
});
```

## 6. Modelo de dados

Todo documento de negócio carrega `escritorioId`. É o que as regras verificam.

```
users        { escritorioId, role, status, paymentApproved, plano, displayName, email }
             ^ estes campos NÃO podem ser gravados pelo cliente (as regras bloqueiam)
escritorios  { nome, plano, limites, foroPadrao: {...}, estilo: {...} }
cases        { escritorioId, titulo, numeroCnj, cliente, qualificacaoCliente,
               parteContraria, polo, area, rito, comarca, valorCausa, teseCentral,
               fatos, documentos, criadoEm, atualizadoEm }
documents    { escritorioId, casoId, nomeArquivo, tipoDocumento, area, storagePath,
               bytes, criadoEm }
analyses     { escritorioId, casoId, documentoId, resultado, modelo, criadoEm }
             ^ imutável: não se edita análise, refaz-se
petitions    { escritorioId, casoId, tipoPeca, plano, texto, checklist, versao,
               status: "minuta" | "em_revisao" | "aprovada",
               revisadoPor, revisadoEm, criadoEm }
templates    { escritorioId, titulo, area, tipoPeca, conteudo, criadoEm }
audit        { escritorioId, uid, acao, alvo, criadoEm }   // só o servidor grava
```

Os formatos dos overlays estão em `src/skills/overlays/index.js`:
`PACOTE_FORO_MODELO` e `PACOTE_ESTILO_MODELO`. Há um pacote inicial de Goiânia
(`FORO_TJGO_GOIANIA`) que **não foi conferido** — o escritório precisa validar
endereçamento e sistema de peticionamento antes do go-live.

---

## 7. O que não mudar

Estas são decisões fechadas. Se algo aqui precisar mudar, é conversa antes, não
refatoração no meio de uma tarefa.

1. **JavaScript, não TypeScript.** Next.js App Router, `styled-jsx`, sem Tailwind.
   O sistema-base é assim e a regra do projeto é não alterar o formato de programação.
2. **A inteligência mora em `functions/skills/`, atrás de `functions/skills/index.js`.**
   Nenhuma function importa o motor diretamente.
   O front **nunca** importa de `functions/` — se precisar de uma lista, ela é
   gerada em `src/lib/catalogo.js`.
3. **SDK cliente só no navegador; Admin SDK só no servidor.** Sem exceção.
4. **O que é conta, é código.** Prazo, valor da causa e checklist formal não podem
   depender de o modelo acertar aritmética.
5. **Nada de jurisprudência de memória.** Se o precedente não veio no material da
   requisição, a peça sai com `[PESQUISA PENDENTE: ...]`.
6. **Toda saída nasce como minuta.** Estado explícito de revisão pendente.
7. **Antes de incorporar código de terceiro, leia a licença** e registre a decisão
   em `CREDITOS-E-LICENCAS.md`. AGPL e CC BY-SA são incompatíveis com este produto.
8. **A `ANTHROPIC_API_KEY` nunca chega ao navegador.** Nada de `NEXT_PUBLIC_` nela,
   nada de chamar a API da Anthropic do cliente "para simplificar".
9. **Nada de rota `[id]`, `middleware.js`, SSR ou revalidação.** O front é export
   estático. Estado de navegação vai em query string.

---

## 8. Como o cérebro é estendido

Para acrescentar uma skill nova, siga o padrão das quatro peças:

```
functions/skills/<nome>/
├── index.js      função pública + system prompt + construtor de dossiê + enriquecimento
└── schemas.js    o JSON Schema que o modelo é obrigado a preencher
```

E então: exporte em `functions/skills/index.js`, valide a entrada com Zod em
`functions/lib/validation.js`, acrescente o preset em `rate-limiter-presets.js`, e
crie a function em `functions/index.js` com o envelope `protegida()` (CORS → auth
→ limite → validação → skill → resposta). No front, some um método em
`src/lib/api.js`.

O quarto item — o enriquecimento em código — é o que separa este produto de um
wrapper de LLM. Toda vez que o modelo devolver um número que importa, recalcule.

---

## 9. Prompts de arranque para o Antigravity

Cole um por vez. Cada um é uma tarefa fechada.

**Contexto inicial (cole sempre no começo da sessão):**
```
Leia AGENTS.md, .antigravity/rules.md, README.md, ARQUITETURA.md e WALKTHROUGH.md
antes de qualquer coisa.

Este repositório tem duas peças: o front estático em src/ (Next.js output export,
JavaScript, styled-jsx, sem Tailwind) e o backend em functions/ (Cloud Functions).
O front NUNCA importa de functions/ e NUNCA vê a chave da Anthropic. Rotas com
segmento dinâmico [id] não existem: use query string.

O padrão de tela a copiar está em ../recrutamento-selecao-ia/src/app/dashboard/.
```

**Tarefa 1 — provar o cérebro:**
```
Crie functions/scripts/smoke.mjs conforme o Passo 5 do WALKTHROUGH.md: carregar um
PDF local, chamar analisarDocumento direto da skill (sem passar pela function) e
imprimir triagem_admissibilidade, prazos_calculados e indicadores. Não altere
nenhum arquivo de functions/skills/. Depois me diga o que a saída revelou sobre o
schema.
```

**Tarefa 2 — tela de casos:**
```
Crie src/app/dashboard/casos/page.js seguindo o padrão de
../recrutamento-selecao-ia/src/app/dashboard/jobs/. A ficha do caso abre por query
string (/casos?id=abc123), nunca por rota dinâmica. Campos conforme a seção 6 do
WALKTHROUGH.md. Use o Firestore pelo SDK cliente (src/lib/firebase.js), sempre
gravando escritorioId. Áreas e polos vêm de src/lib/catalogo.js. Reaproveite
GlassCard, PageHeader e StatCard.
```

**Tarefa 3 — tela de documentos:**
```
Crie src/app/dashboard/documentos/page.js seguindo o fluxo de
../recrutamento-selecao-ia/src/app/dashboard/candidates/page.js, mas quebrado em
componentes (o original tem 1.633 linhas num arquivo só).

Fluxo: upload → prepararConteudo() de src/lib/api.js → rodar detectarPeca() de
src/utils/pieceDetection.js sobre o texto e mostrar como sugestão para o usuário
confirmar → analisarDocumento() → renderizar a análise → salvar em analyses com
escritorioId. Contratos na seção 5 do WALKTHROUGH.md.
```

**Tarefa 4 — tela de peças:**
```
Crie src/app/dashboard/peticoes/page.js com o fluxo de duas fases: planejarPeca()
de src/lib/api.js, exibir o plano para o advogado validar ou editar, e só então
redigirPeca(corpo, aoReceber) — que já entrega o texto em pedaços, para a peça
aparecer enquanto sai. Se plano.pode_redigir for false, mostre os bloqueios e não
libere a redação. Tipos de peça vêm de src/lib/catalogo.js.
```

**Tarefa 5 — mascaramento de PII (bloqueador 1):**
```
Porte functions/../referencias/sistema-de-peticoes/core/redaction.py para
functions/lib/redaction.js, em JavaScript, mantendo a lógica de tokens estáveis
(mesmo CPF -> mesmo token). Aplique em functions/skills/doc-analyst antes de enviar
texto para a API, e reverta os tokens na resposta. Não mascare em PDF nativo — nesse
caso registre a limitação no PENDENCIAS.md. Ver bloqueador 1.
```

## 10. Armadilhas já encontradas

**1. CRLF quebra regex de linha, silenciosamente.**
Em JavaScript o `.` não casa `\r`. Um `/^##\s+(.*)$/` falha em todo cabeçalho de
arquivo salvo no Windows — e falha sem erro, devolvendo vazio. O gerador da base
jurídica normalizou CRLF por causa disso. Se um parser seu "não achou nada",
suspeite disso antes de qualquer outra coisa.

**2. Backtick dentro de template literal.**
Os system prompts são template literals grandes. Citar um nome de campo com crase
dentro deles fecha a string. Use aspas ou nada.

**3. `pdf-parse` é só triagem aqui.**
Não volte a usá-lo como extrator principal: o PDF vai nativo para a API, que lê
texto e imagem e devolve citação por página. O `parse-file` usa `pdf-parse` apenas
nas 12 primeiras páginas, para detectar tipo e número CNJ.

**4. Claims não valem até o token ser renovado.**
Depois de `definirClaims`, o navegador continua com o token antigo. Force
`getIdToken(true)` ou o usuário vai levar 403 sem entender por quê.

**5. O limite de 32 MB é por requisição, não por arquivo.**
Autos maiores precisam ser divididos por seção (peças, provas, decisões) antes do
upload. A rota já devolve mensagem nesse sentido.

**6. Dois arquivos são gerados e ignorados pelo git.**
Depois de todo clone: `npm run build:catalogo` e
`npm --prefix functions run build:base`.

**7. `.nojekyll` decide se o site sobe com CSS.**
O Pages passa o conteúdo pelo Jekyll, que ignora pastas iniciadas por `_`. O Next
escreve tudo em `_next/`. Sem o arquivo, o site sobe sem estilo e sem JavaScript,
e não há erro em lugar nenhum. O workflow cria; `public/.nojekyll` está versionado.

**8. CORS mal configurado parece bug de autenticação.**
Sem `ORIGENS_PERMITIDAS` com o domínio do Pages, a function devolve 403 e o
navegador reporta erro de CORS. Antes de investigar token, confira a variável.

**9. `basePath` errado quebra todos os links.**
Site em `<usuario>.github.io/juridico-ia` precisa de `NEXT_PUBLIC_BASE_PATH=/juridico-ia`.
Com domínio próprio, precisa ficar vazio. Com o valor errado, o build passa e o
site abre em branco.

---

## 11. Se você só tem cinco minutos

```bash
npm install && npm run build:catalogo
npm --prefix functions install && npm --prefix functions run build:base
cp .env.example .env.local            # preencha as chaves públicas do front
cp functions/.env.example functions/.env
npm run dev
```

O `build:base` deve imprimir 12 blocos, com `comum` em ~10.500 chars.

Depois: **Passo 5** (prove que o cérebro responde antes de construir tela) e
**Tarefa 2** dos prompts (tela de casos). Nessa ordem — construir UI sobre um
cérebro que nunca respondeu é o jeito mais rápido de descobrir tarde que o schema
está errado.

A decisão que continua pendente e não é técnica: **qual área do direito concentra
o volume do escritório piloto.** A base doutrinária tem 12k caracteres em família
e 1,2k em previdenciário — a cobertura é desigual de propósito, e o produto nasce
bom em uma área ou medíocre em onze.
