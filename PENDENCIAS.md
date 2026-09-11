# Pendências — Jurídico IA

Estado em 10/09/2026. O que está de pé, o que falta, e o que **não pode ir para
produção sem resolver**.

## Pronto

- [x] Fork do RecrutaAI com auth, layout, guards, onboarding e painel admin herdados
- [x] **Migração para GitHub Pages + Cloud Functions** — sem Netlify, sem Vercel
- [x] `claude-client` — chamada, streaming, saída estruturada por tool, PDF nativo, Files API, prompt caching
- [x] `doc-analyst` — schema da análise, revisão adversarial, enriquecimento em código
- [x] `petition-drafter` — plano, redação em streaming, 12 tipos de peça, checklist formal
- [x] `base-juridica` — doutrina por área como contexto cacheável, com gerador
- [x] `overlays` — pacote de foro e pacote de estilo do escritório
- [x] `prazos.js` — dias úteis, feriados nacionais e móveis, recesso forense
- [x] `auth-middleware` com `verifyIdToken` real + Admin SDK com credencial automática
- [x] `firestore.rules` com isolamento por escritório e sem master admin lendo caso
- [x] Functions: parseFile, analisar, planejar, redigir (streaming), revisar
- [x] CORS com origens explícitas
- [x] **Rate limit no Firestore com TTL** — resolvido o bloqueador nº 1 da rodada anterior
- [x] `src/lib/api.js` — cliente HTTP com token e leitura de stream
- [x] `src/lib/catalogo.js` gerado a partir do cérebro (uma fonte de verdade)
- [x] Workflows do GitHub Actions para front e backend
- [x] `scripts/bootstrap-admin.mjs` — custom claims do primeiro admin
- [x] Créditos e análise de licença de cada fonte

## Bloqueadores de produção

| # | Item | Situação |
|---|---|---|
| 1 | **Mascaramento de PII** | Antes de enviar autos para provedor externo, mascarar CPF, CNPJ, RG, NIT e contatos, como faz o `redaction.py` do Sistema de Petições (em `referencias/`). Hoje o documento vai inteiro. |
| 2 | **Storage dos autos** | O documento vai para a API e não é guardado. Definir retenção e regras do Firebase Storage por escritório antes de prometer arquivo ao cliente. Resolve também o teto de 20 MB por requisição. |
| 3 | **Trilha de auditoria** | A coleção `audit` existe nas regras, mas nada grava nela. Registrar quem acessou qual caso e quem revisou qual minuta. |
| 4 | **Licença da base doutrinária** | `referencias/advogado-especialista` não tem licença declarada. Ver CREDITOS-E-LICENCAS.md §2 antes de vender para terceiros. |
| 5 | **Feriados locais** | `prazos.js` cobre feriados nacionais e recesso. Feriados estaduais, municipais e suspensões de tribunal precisam ser cadastrados por escritório. Toda data sai com aviso de conferência. |
| 6 | **Nada foi executado ainda** | Nenhuma function foi implantada, nenhuma chamada à Anthropic aconteceu. O passo 4 do WALKTHROUGH existe para isso, e vem antes de qualquer tela. |

## Interface a construir

As páginas de domínio ainda não existem. O molde é `dashboard/candidates/page.js`
do RecrutaAI: abas, upload, resultado, histórico.

**Atenção do export estático:** nada de `[id]` em rota. Use `?id=`.

- [ ] `dashboard/casos` — lista e ficha do caso (partes, polo, rito, comarca, prazos)
- [ ] `dashboard/documentos` — upload, análise, parecer, histórico por caso
- [ ] `dashboard/peticoes` — plano, editor de minuta, revisão, exportação `.docx`
- [ ] `dashboard/biblioteca` — modelos e teses do escritório
- [ ] `dashboard/settings` — pacotes de foro e de estilo (hoje só o herdado)
- [ ] Parecer visual — adaptar as 708 linhas do `report-generator` do RecrutaAI
- [ ] Exportação `.docx` com timbre do escritório (dependência `docx` já instalada)
- [ ] Remover `src/middleware.js` se ainda existir — não funciona em export estático

## Fase 4 — jurisprudência

- [ ] Busca como *tool* que o modelo chama, com a regra de nunca citar o que não
      foi recuperado nesta requisição
- [ ] Avaliar consumir o MCP hospedado do JurisprudenciaIA como cliente
- [ ] Fonte pública (dados processuais do CNJ) antes de base paga

## Decisão pendente do cliente

**Qual área do direito concentra o volume do escritório piloto.** O `doc-analyst`
nasce bom em uma área e medíocre em onze: checklist de admissibilidade, doutrina e
modelos são específicos. A base tem 12k caracteres em família e 1,2k em
previdenciário — a cobertura é desigual de propósito.
