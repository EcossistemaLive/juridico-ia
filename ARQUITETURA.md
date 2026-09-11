# Arquitetura — Jurídico IA

## A decisão de fundo

O RecrutaAI não é um sistema de recrutamento com IA acoplada: é um chassi de
produto de IA documental com um cérebro de R&S plugado. `src/services/aiService.js`
tem 19 linhas e é só um re-export — uma fachada que existe para que as rotas nunca
importem o motor. Trocar o cérebro é trocar o conteúdo de `src/skills/`.

Este produto exerce exatamente essa possibilidade. O formato de programação não
muda: JavaScript, Next.js App Router, `styled-jsx`, Firebase, mesmo padrão de
skills. O que muda é onde o código roda.

## A separação front / backend

O front é estático no GitHub Pages. Pages não tem servidor — então as rotas de
API do Next viraram Cloud Functions. Não é preferência de arquitetura: é a única
forma de manter a `ANTHROPIC_API_KEY` fora do navegador. Chave de IA no bundle do
cliente é extraível por qualquer usuário logado, e num produto cobrado por token
isso é a conta aberta.

```
GitHub Pages (estático)          Cloud Functions (southamerica-east1)
Next output:export        HTTPS  parseFile · analisar · planejar
Firebase Auth (cliente)  ──────► redigir · revisar
                    Bearer token ANTHROPIC_API_KEY + Admin SDK
        │                                   │
        └──────────── Firestore ────────────┘
                (regras por escritório)
```

Três consequências práticas do export estático:

1. Nada de rota dinâmica de segmento. `casos/[id]` exigiria conhecer os ids em
   build; casos são dados de cliente. Use query string: `/casos?id=abc123`.
2. Nada de `middleware.js`, SSR ou revalidação. Tudo é cliente.
3. Cabeçalhos de segurança não vêm mais do Next: quem os aplica é o Pages (limitado)
   e as próprias functions nas respostas de API.

## O mapeamento de domínio

| RecrutaAI | Aqui | O que muda de fato |
|---|---|---|
| Vaga (`jobs`) | Caso (`cases`) | partes, polo, área, rito, comarca, nº CNJ, valor da causa |
| Família da vaga | Área do direito | 11 áreas, cada uma com doutrina e checklist próprios |
| Arquétipo do cargo | Tipo de peça | 12 tipos, cada um com estrutura e requisitos formais |
| Pesos do scorecard | Requisitos legais da peça | art. 319 para inicial, art. 336 para contestação, admissibilidade para recurso |
| Candidato (`candidates`) | Documento (`documents`) | peça contrária, sentença, contrato, laudo, prova |
| Gate check eliminatório | Triagem de admissibilidade | prescrição, decadência, tempestividade, legitimidade, competência |
| Análise STAR | Fato → prova → folha | cada alegação vinculada à prova e à localização |
| Matriz SWOT | Matriz de risco processual | forças, vulnerabilidades, teses adversas, cenário de acordo |
| Roteiro de entrevista | Peça (`petitions`) | streaming, editável, exportável |
| — | Biblioteca (`templates`) | modelos e teses do escritório; sem equivalente no RecrutaAI |
| — | Overlays | pacote de foro e pacote de estilo; sem equivalente |

## As cinco camadas do cérebro

```
                 rota de API
                      │
              services/aiService.js          fachada estável
                      │
   ┌──────────────────┼───────────────────┐
   │                  │                   │
doc-analyst    petition-drafter        overlays          skills de domínio
   │                  │                   │
   └────────┬─────────┴───────────────────┘
            │
     base-juridica          doutrina por área (contexto cacheável)
            │
      claude-client         chamada, streaming, structured output, PDF, cache
```

Cada skill de domínio tem as mesmas quatro peças do RecrutaAI:

| Peça | Função |
|---|---|
| System prompt | identidade, regra-raiz anti-invenção, método |
| Construtor de dossiê | os dados concretos do caso |
| Schema | força o modelo a preencher todos os campos |
| Enriquecimento | recalcula em código o que não pode depender do modelo |

O quarto item é o mais importante. No RecrutaAI o `enrichAnalysisResult` existia
porque a nota final não podia depender de a IA acertar uma multiplicação. Aqui a
aposta é maior: **prazo, valor da causa e checklist formal se calculam em código**.
Um prazo errado não é um parecer fraco — é preclusão.

## O que veio de fora

Quatro projetos abertos foram estudados e três tiveram método incorporado. A
tabela completa, com licença e o que foi ou não usado, está em
[CREDITOS-E-LICENCAS.md](CREDITOS-E-LICENCAS.md). Em resumo:

- **Advocacia Aberta** — as duas fases da redação (planejar, depois redigir), a
  regra-raiz anti-invenção e a disciplina de revisão por inventário.
- **Sistema de Petições** — o catálogo de tipos de peça e a marcação
  `[DADO FALTANTE]`.
- **Themis Skills** — o padrão de overlays, a cobertura de elementos por pedido, a
  integridade da linha do tempo e a superfície de ataque.
- **Auditor Estratégico Jurídico** — não incorporado: AGPL-3.0 é incompatível com
  SaaS fechado.

## O que muda na infraestrutura

Sete correções deliberadas em relação ao que foi herdado, todas por causa do que
o produto passa a guardar:

1. `verifyIdToken` real no lugar da checagem de formato de token.
2. Admin SDK no servidor; SDK cliente só no navegador. Dentro das functions a
   credencial é automática — não existe mais chave privada em variável de ambiente.
3. Isolamento por escritório, não por usuário.
4. Papel em custom claims, não em e-mail no código-fonte.
5. Sem master admin lendo caso de cliente — sigilo profissional não abre exceção
   para o administrador da plataforma.
6. Rate limit contado no Firestore com TTL, não em `Map` de processo. Em qualquer
   serverless cada invocação pode cair numa instância nova, e o limite em memória
   é imprevisível — com Opus na ponta, isso era exposição financeira.
7. CORS com lista explícita de origens. Com front e backend em domínios diferentes,
   toda chamada é cross-origin; `*` não é aceitável aqui, mesmo exigindo token.

## Fronteira do produto

O sistema analisa, planeja, redige minuta e revisa. Não decide, não assina, não
protocola e não afirma tempestividade sem conferência local. Toda saída nasce
como minuta com revisão pendente. Essa fronteira é de projeto, não de disclaimer:
está no schema, no estado do documento e na regra de exportação.
