# Pendências — Jurídico IA

Estado em 10/09/2026. O que está de pé, o que falta, e o que **não pode ir para
produção sem resolver**.

## Pronto nesta rodada

- [x] Fork do RecrutaAI com auth, layout, guards, planos, onboarding e painel admin herdados
- [x] `claude-client` — chamada, streaming, saída estruturada por tool, PDF nativo, Files API, prompt caching
- [x] `doc-analyst` — schema da análise, revisão adversarial, enriquecimento em código
- [x] `petition-drafter` — plano, redação em streaming, catálogo de 12 tipos de peça, checklist formal
- [x] `base-juridica` — doutrina por área como contexto cacheável, com gerador
- [x] `overlays` — pacote de foro e pacote de estilo do escritório
- [x] `prazos.js` — dias úteis, feriados nacionais e móveis, recesso forense
- [x] `auth-middleware` com `verifyIdToken` real + Admin SDK
- [x] `firestore.rules` com isolamento por escritório e sem master admin lendo caso
- [x] Rotas: parse-file, analyze-document, plan-petition, draft-petition, review-petition
- [x] Créditos e análise de licença de cada fonte

## Bloqueadores de produção

| # | Item | Situação |
|---|---|---|
| 1 | **Rate limit em memória** | `rate-limiter.js` veio do RecrutaAI com um `Map` no processo. Em serverless o limite é imprevisível — e com Opus na ponta isso é exposição financeira. Trocar por contador no Firestore ou Upstash, mantendo a interface de `rate-limiter-presets.js`. |
| 2 | **Mascaramento de PII** | Antes de enviar autos para provedor externo, mascarar CPF, CNPJ, RG, NIT e contatos, como faz o `redaction.py` do Sistema de Petições. Hoje o documento vai inteiro. |
| 3 | **Storage dos autos** | Upload hoje é em memória: o documento vai para a API e não é guardado. Definir retenção e regras do Firebase Storage por escritório antes de prometer arquivo. |
| 4 | **Trilha de auditoria** | A coleção `audit` existe nas regras, mas nada grava nela. Registrar quem acessou qual caso e quem revisou qual minuta. |
| 5 | **Licença da base doutrinária** | `referencias/advogado-especialista` não tem licença declarada. Ver CREDITOS-E-LICENCAS.md §2 antes de vender para terceiros. |
| 6 | **Feriados locais** | `prazos.js` cobre feriados nacionais e recesso. Feriados estaduais, municipais e suspensões de tribunal precisam ser cadastrados por escritório. Enquanto isso, toda data sai com aviso de conferência. |

## Interface a construir

As páginas de domínio ainda não existem — o dashboard, o login e o fluxo de conta
foram herdados prontos, mas `casos`, `documentos`, `peticoes` e `biblioteca`
precisam ser escritas. O molde é `dashboard/candidates/page.js` do RecrutaAI:
abas, upload, resultado, histórico.

- [ ] `dashboard/casos` — lista e ficha do caso (partes, polo, rito, comarca, prazos)
- [ ] `dashboard/documentos` — upload, análise, parecer, histórico por caso
- [ ] `dashboard/peticoes` — plano, editor de minuta, revisão, exportação `.docx`
- [ ] `dashboard/biblioteca` — modelos e teses do escritório
- [ ] `dashboard/settings` — pacotes de foro e de estilo (hoje só o herdado)
- [ ] Parecer visual — adaptar as 708 linhas do `report-generator` do RecrutaAI
- [ ] Exportação `.docx` com timbre do escritório (dependência `docx` já instalada)

## Fase 4 — jurisprudência

- [ ] Busca como *tool* que o modelo chama, com a regra de nunca citar o que não
      foi recuperado nesta requisição
- [ ] Avaliar consumir o MCP hospedado do JurisprudenciaIA como cliente
- [ ] Fonte pública (dados processuais do CNJ) antes de base paga

## Decisão pendente do cliente

**Qual área do direito concentra o volume do escritório piloto.** O `doc-analyst`
nasce bom em uma área e medíocre em seis: checklist de admissibilidade, doutrina e
modelos são específicos. Escolher uma, entregar funda, replicar depois.
