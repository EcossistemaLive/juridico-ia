# AGENTS.md — Jurídico IA

Instruções para agentes de IA que trabalham neste repositório (Antigravity, Codex,
Claude Code, Cursor). Leia antes de editar qualquer arquivo.

## O que é este projeto

SaaS jurídico do Ecossistema Live: analisa documentos processuais e elabora peças.
Construído sobre o chassi do RecrutaAI (`../recrutamento-selecao-ia`), que é a
referência de padrão sempre que você precisar de um molde de tela.

## Duas peças, dois deploys

| | Front | Backend |
|---|---|---|
| Onde | `src/` | `functions/` |
| Roda em | GitHub Pages (estático) | Cloud Functions, southamerica-east1 |
| Publica com | `.github/workflows/deploy-pages.yml` | `.github/workflows/deploy-functions.yml` |
| Pode ver a chave da Anthropic | **não** | sim |

O front **nunca** importa de `functions/`. Se precisar de uma lista que existe no
cérebro, ela é gerada em `src/lib/catalogo.js` por `npm run build:catalogo`.

## Regras invioláveis

1. **JavaScript, não TypeScript.** Next.js App Router, `styled-jsx`, sem Tailwind
   e sem biblioteca de componentes. Não altere o formato de programação.
2. **`ANTHROPIC_API_KEY` nunca chega ao navegador.** Nada de `NEXT_PUBLIC_` nela.
   Nada de chamar a API da Anthropic do cliente.
3. **Export estático:** sem rota `[id]`, sem `middleware.js`, sem SSR, sem
   revalidação. Estado de navegação vai em query string (`/casos?id=abc123`).
4. **A inteligência mora em `functions/skills/`, atrás de `functions/skills/index.js`.**
   Nenhuma function importa o motor diretamente.
5. **SDK cliente só no navegador; Admin SDK só nas functions.**
6. **Todo documento de negócio carrega `escritorioId`.** É o que as regras verificam.
7. **O que é conta, é código.** Prazo, valor da causa e checklist formal não podem
   depender de o modelo acertar aritmética.
8. **Nada de jurisprudência de memória.** Precedente que não veio no material da
   requisição vira `[PESQUISA PENDENTE: ...]` no texto.
9. **Toda saída nasce como minuta**, com estado de revisão pendente.
10. **Antes de incorporar código de terceiro, leia a licença** e registre em
    `CREDITOS-E-LICENCAS.md`. AGPL e CC BY-SA são incompatíveis com este produto.

## Comandos

```bash
npm install && npm run build:catalogo      # front
npm run dev                                 # localhost:3000

npm --prefix functions install
npm --prefix functions run build:base       # gera a base jurídica
npm --prefix functions run serve            # emulador

npm run lint
firebase deploy --only functions
firebase deploy --only firestore
```

## Arquivos gerados — não edite à mão

- `src/lib/catalogo.js` → `npm run build:catalogo`
- `functions/skills/base-juridica/conteudo.js` → `npm --prefix functions run build:base`

## Onde ler antes de agir

| Preciso de | Leia |
|---|---|
| visão geral | `README.md` |
| por que está assim | `ARQUITETURA.md` |
| contratos das functions | `WALKTHROUGH.md` §5 |
| modelo de dados | `WALKTHROUGH.md` §6 |
| o que falta | `PENDENCIAS.md` |
| infra e deploy | `DEPLOY.md` |
| o que não pode ser copiado | `CREDITOS-E-LICENCAS.md` |
| método de origem | `referencias/` |

## Convenções

- Commits: `feat:`, `fix:`, `docs:`, `chore:`, com escopo (`feat(peticoes): ...`).
- Comentário em português, explicando **por que**, não o que a linha faz.
- Nome de variável e de campo em português (`escritorioId`, `tipoPeca`, `prazos`).
- Ao copiar tela do RecrutaAI, quebre em componentes: o original tem arquivos de
  1.600 linhas e essa dívida não se repete aqui.
