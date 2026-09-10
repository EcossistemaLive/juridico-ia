# Créditos e licenças

Este produto reaproveita método e material de projetos abertos. Este arquivo diz
o que veio de onde, sob qual licença, e **o que não pode ser usado** — a última
parte é a mais importante, porque o produto é comercial e oferecido como serviço
pela rede.

Última verificação: 10/09/2026. Reconfira antes de cada release público.

---

## 1. Material incorporado — licença compatível

### Advocacia Aberta — MIT
`referencias/advocacia-aberta/` · https://github.com/emidio-trancoso/advocacia-aberta
Autor: Emidio Trancoso. Licença MIT (permite uso comercial, exige preservar o
aviso de copyright).

O que foi aproveitado: o método. A estrutura de duas fases da redação (planejar
antes de redigir), a regra-raiz anti-invenção com marcação `[verificar na fonte]`,
o diagnóstico adversarial, a disciplina de revisão por inventário de referências
e a política de sigilo (`SIGILO-E-DADOS.md`), que orientou o desenho do isolamento
por escritório.

### Sistema de Petições — MIT
`referencias/sistema-de-peticoes/` · https://github.com/1kookieh/sistema-de-peticoes
Autor: 1kookieh. Licença MIT.

O que foi aproveitado: o catálogo de tipos de peça com perfis formais, a marcação
`[DADO FALTANTE: ...]`, o contrato estruturado da minuta (`LegalDocumentDraft`) e a
ideia de mascarar PII antes de enviar a provedor externo (`redaction.py`) — esta
última **ainda não implementada** aqui e registrada como pendência.

### Themis Skills — MIT
`referencias/themis-skills/` · https://github.com/Themis-Legal-Framework/themis-skills
Autor: Themis Legal Framework. Licença MIT. Conteúdo de litígio civil dos EUA;
o que se aproveita é a arquitetura, não o direito.

O que foi aproveitado: o padrão de **overlays** (pacote de foro + pacote de estilo),
que virou `src/skills/overlays/`; a **cobertura de elementos** por pedido
(coberto / fraco / ausente), que virou `cobertura_elementos` no plano da peça; a
**integridade da linha do tempo** e a **superfície de ataque**, que viraram campos
da análise; e o princípio "entregue a minuta, não um memorando sobre a minuta".

---

## 2. Material incorporado — licença não declarada

### Advogado Especialista (antigravity-awesome-skills)
`referencias/advogado-especialista/` · autoria indicada no cabeçalho: `renat`,
`source: community`, sem arquivo de licença.

É a base doutrinária por área do direito usada em `src/skills/base-juridica/`.
Duas observações:

1. **Texto de lei não é protegido por direito autoral no Brasil** (art. 8º, IV, da
   Lei 9.610/1998), então artigos, súmulas e prazos citados podem ser usados
   livremente. O que pode ser protegido é a *compilação* — a seleção e a
   organização do material.
2. Como não há licença declarada, o uso comercial fica em zona cinzenta. Antes de
   vender o produto para terceiros, escolha um caminho: (a) localizar o autor e
   obter autorização; (b) reescrever a compilação a partir das fontes oficiais,
   usando este material apenas como roteiro de cobertura; ou (c) substituir por
   base própria do escritório.

Enquanto isso não se resolve, trate como material de desenvolvimento.

---

## 3. Material NÃO incorporado — e por quê

### Auditor Estratégico Jurídico — AGPL-3.0 + CC BY-SA 4.0
https://github.com/pizaniadv/auditor-estrategico-juridico
Autor: Raphael Sousa Pizani Silva (OAB/BA 32.472).

**Não foi copiado para este repositório, e não deve ser.** O licenciamento é duplo
e copyleft, e o `NOTICE` do projeto é explícito: quem incorpora o trabalho a um
sistema e o oferece a terceiros **inclusive remotamente, como serviço acessado por
rede**, precisa disponibilizar a esses usuários o código-fonte completo da sua
versão sob AGPL-3.0. O autor declara que não autoriza fechar o trabalho dentro de
produto de terceiros.

Como este produto é SaaS multi-tenant vendido a escritórios, incorporar aquele
material obrigaria a abrir todo o código do sistema. As saídas possíveis são:

- **negociar licença comercial** com o autor (ele é advogado em exercício e o
  projeto tem atribuição nominal obrigatória — é uma conversa viável);
- **usar apenas como leitura de referência**, sem copiar texto, estrutura de
  seções, nomes de módulos nem formatos de saída — ideia não é protegida,
  expressão é;
- **não usar**.

O caminho adotado aqui é o terceiro, com registro desta decisão. Se você quiser o
segundo, a fronteira é estreita e vale conferência: reescrever com outra estrutura
não afasta derivação se a organização do método for reconhecível.

### JurisprudenciaIA MCP — sem licença
https://github.com/brunoflma/jurisprudenciaia-mcp

Repositório sem arquivo de licença. Sem licença expressa, o padrão é *todos os
direitos reservados*: o código não pode ser copiado nem adaptado.

O que **pode** ser feito, e é o melhor caminho de qualquer forma: **consumir** o
MCP hospedado como cliente, quando a fase 4 (jurisprudência) chegar. Usar um
serviço não é copiar código. A instrução do próprio servidor já traz a regra que
adotamos: tratar o resultado como primeira camada de pesquisa e validar na fonte
oficial antes de citar em peça.

### JusTraduz — MIT
https://github.com/TeamGHCP/JusTraduz

MIT, mas é PHP com arquitetura própria (MySQL, frontend em PHP). Copiar código
violaria a regra deste projeto de não alterar a estrutura do sistema. O que foi
aproveitado é conceitual: o **modelo de dados** de uma plataforma jurídica
multi-organização (organizações, membros, convites, casos, documentos, mensagens,
trilha de auditoria, eventos de uso, planos e assinaturas) confirmou o desenho das
nossas coleções — em especial ter `audit` e `usage_events` desde o início, e não
como item de fase 5.

---

## 4. Regra da casa

Antes de incorporar qualquer material novo:

1. Procure o arquivo `LICENSE`. Sem licença, presuma proibido.
2. AGPL e SSPL são incompatíveis com este produto. GPL para código executado em
   servidor exige análise caso a caso.
3. MIT, Apache-2.0, BSD e CC BY são compatíveis — preservando os avisos.
4. CC BY-SA obriga a licenciar o derivado sob a mesma licença: incompatível com
   produto fechado.
5. Registre a decisão aqui, com data.
