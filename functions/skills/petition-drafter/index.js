/**
 * Petition Drafter Skill — Modo 2 (Elaboração de peça)
 *
 * Espelha o `job-architect` do RecrutaAI: streaming de texto, temperatura baixa,
 * formatação rígida. As regras de sobriedade viram regras forenses.
 *
 * Duas fases, como na skill `redigir-peca` da Advocacia Aberta:
 *   1. planejarPeca()  -> plano estruturado, submetido ao advogado
 *   2. redigirPeca()   -> streaming da peça, só depois do plano aprovado
 * E, depois da redação, `conferirChecklist()` roda os requisitos formais em código.
 */

import { callClaudeStructured, streamClaude, removeEmojis, MODELS } from "../claude-client/index.js";
import { SCHEMA_PLANO_PECA } from "./schemas.js";
import { getTipoPeca } from "./piece-types.js";
import { getBaseJuridica, AREA_LABELS, AVISO_RESPONSABILIDADE } from "../base-juridica/index.js";
import { montarOverlays } from "../overlays/index.js";
import { validarSegurancaCampos, enveloparDadoPassivo } from "../../lib/prompt-guard.js";

/**
 * Regras que valem para as duas fases. Esta é a metodologia do produto —
 * a parte que separa a ferramenta de um prompt genérico.
 */
export const REGRA_RAIZ = `REGRA-RAIZ — NUNCA INVENTAR
Violá-la é pior do que omitir um argumento.
- FATOS: só o que está no material do caso. Nunca invente datas, valores, nomes, números de
  processo, protocolos ou acontecimentos.
- LEI: texto de artigo só entra na peça copiado da base jurídica anexada ou do material do
  caso. Nunca de memória.
- JURISPRUDÊNCIA: ementa, súmula, tema repetitivo ou acórdão só entram se constarem do
  material de fundamentação fornecido nesta chamada, com a identificação completa. Você NÃO
  tem base de jurisprudência aqui. Se não houver precedente fornecido, a peça se sustenta em
  lei e fato — e você escreve [PESQUISA PENDENTE: tese X] onde um precedente ajudaria.
- DEPOIMENTOS: uma aspa só existe se a frase aparecer literalmente na transcrição fornecida.

Quando faltar dado, escreva a marcação no corpo do texto, exatamente assim:
[DADO FALTANTE: descrição objetiva do que falta]
Quando precisar conferir uma citação, escreva:
[verificar na fonte]
Nunca preencha a lacuna com plausibilidade. A marcação é o produto correto.`;

export const REGRAS_REDACAO = `DIRETRIZES DE REDAÇÃO FORENSE
- Sem emoji, sem asterisco de markdown, sem meta-comentário, sem explicar o que você vai fazer.
- Títulos de seção em CAIXA ALTA, separados por linha em branco.
- Períodos curtos. Voz ativa. Uma ideia por parágrafo.
- Proibido: adjetivação vazia ("clarividente decisão", "nobre julgador", "data venia" em
  excesso), latinismo decorativo, apelo emocional sem fato, e frase de efeito sem norma.
- Cada afirmação de fato aponta o documento que a prova, no formato (doc. X, fl. Y) quando a
  folha for conhecida.
- A firmeza do tom acompanha a solidez da tese: tese frágil se sustenta em tom ponderado ou
  entra como pedido subsidiário. Texto com aparência de sofisticação e substância frágil é
  mais perigoso que texto simples e sólido.
- Pedidos certos e determinados, numerados, em ordem lógica de prejudicialidade.
- A peça termina no fecho e na assinatura. Nenhum comentário depois.`;

/**
 * FASE 1 — Plano da peça, para validação do advogado.
 *
 * @param {string} escritorio
 * @param {object} dados - { tipoPeca, area, caso, analise, fundamentacao, modelosEscritorio, instrucoes }
 * @returns {Promise<object>} plano estruturado
 */
export async function planejarPeca(escritorio, dados = {}) {
    validarEntrada(dados);

    const area = AREA_LABELS[dados.area] ? dados.area : "civil";
    const tipo = getTipoPeca(dados.tipoPeca);

    const systemPrompt = `Você é o redator jurídico sênior do escritório ${escritorio}.

Nesta fase você NÃO redige a peça. Você decide a estratégia e submete à validação do advogado.

${REGRA_RAIZ}

MÉTODO DO PLANO
1. Defina o silogismo central: norma aplicável, fato provado, consequência pretendida.
   Se você não consegue fechar o silogismo com o material disponível, isso é um bloqueio.
2. Mapeie a cobertura dos elementos: para cada pedido, quais requisitos legais precisam estar
   alegados e provados, e qual o estado de cada um (coberto, fraco, ausente). Elemento ausente
   é fatal sem correção — diga isso, não maquie.
3. Hierarquize as teses pela solidez real, não pela vontade do cliente. A tese mais forte
   abre a peça. Tese frágil vai ao final, entra como subsidiária, ou sai — e você diz por quê.
4. Calibre o tom de cada tese pela sua solidez.
5. Antecipe o adversário: para cada tese, o que a outra parte vai sustentar e como a peça já
   responde dentro do próprio texto.
6. Levante os dados faltantes ANTES da redação. Cada um vira uma marcação no texto final.
7. Declare bloqueios: prazo vencido, documento essencial ausente, incompetência, ausência de
   pressuposto processual. Bloqueio impeditivo zera pode_redigir.

TIPO DE PEÇA: ${tipo?.nome || dados.tipoPeca}
ESTRUTURA ESPERADA: ${tipo ? tipo.estrutura.join(" · ") : "conforme a praxe do tipo"}
REQUISITOS FORMAIS A CONTEMPLAR:
${tipo ? tipo.checklist.map((c) => `- ${c.requisito} (${c.fundamento})`).join("\n") : "- conforme a legislação aplicável"}

${montarOverlays(dados.foro, dados.estilo)}`;

    return callClaudeStructured({
        systemPrompt,
        userContent: montarDossie(escritorio, area, dados),
        schema: SCHEMA_PLANO_PECA,
        model: MODELS.analise,
        cacheableContext: getBaseJuridica(area, { contextoEscritorio: dados.modelosEscritorio }),
        toolName: "registrar_plano_peca",
        toolDescription: "Registra o plano da peça para validação do advogado.",
        config: { temperature: 0.2, max_tokens: 12000 }
    });
}

/**
 * FASE 2 — Redação da peça, em streaming.
 * Só deve ser chamada depois de o advogado aprovar (ou editar) o plano.
 *
 * @yields {string} pedaços do texto da peça
 */
export async function* redigirPeca(escritorio, dados = {}, plano = null) {
    validarEntrada(dados);
    if (plano && plano.pode_redigir === false) {
        throw new Error("O plano registrou bloqueio impeditivo. Resolva a pendência antes de redigir.");
    }

    const area = AREA_LABELS[dados.area] ? dados.area : "civil";
    const tipo = getTipoPeca(dados.tipoPeca);

    const systemPrompt = `Você é o redator jurídico sênior do escritório ${escritorio}, redigindo uma
${tipo?.nome || dados.tipoPeca} em ${AREA_LABELS[area]}.

${REGRA_RAIZ}

${REGRAS_REDACAO}

ESTRUTURA OBRIGATÓRIA DESTA PEÇA (nesta ordem, cada seção em CAIXA ALTA):
${tipo ? tipo.estrutura.map((s, i) => `${i + 1}. ${s.toUpperCase()}`).join("\n") : "Conforme a praxe do tipo de peça."}

REQUISITOS FORMAIS QUE A PEÇA PRECISA ATENDER:
${tipo ? tipo.checklist.map((c) => `- ${c.requisito} (${c.fundamento})`).join("\n") : "- conforme a legislação aplicável"}

${montarOverlays(dados.foro, dados.estilo)}

Redija a peça completa e pronta para revisão do advogado. Saída limpa: apenas o texto da peça,
sem preâmbulo, sem comentários seus e sem checklist ao final.`;

    let userContent = montarDossie(escritorio, area, dados);

    if (plano) {
        validarSegurancaCampos(plano, "plano da peça");
        userContent += `\n\n## PLANO APROVADO PELO ADVOGADO\nSiga este plano. Ele já foi validado — não o reabra.\n${JSON.stringify(plano, null, 1)}`;
    }

    if (dados.instrucoes) {
        const instrucoesProtegidas = enveloparDadoPassivo(dados.instrucoes, "instrucoes_advogado");
        userContent += `\n\n## INSTRUÇÕES ESPECÍFICAS DO ADVOGADO\n${instrucoesProtegidas}`;
    }

    userContent += `\n\nRedija agora a ${tipo?.nome || dados.tipoPeca}.`;

    for await (const pedaco of streamClaude({
        systemPrompt,
        userContent,
        model: MODELS.redacao,
        cacheableContext: getBaseJuridica(area, { contextoEscritorio: dados.modelosEscritorio }),
        config: { temperature: 0.25, max_tokens: 16000 }
    })) {
        yield removeEmojis(pedaco);
    }
}

/**
 * Monta o dossiê que alimenta as duas fases.
 * Mesmo padrão do `buildJobPrompt`: dados concretos, sem enfeite.
 */
export function montarDossie(escritorio, area, dados = {}) {
    const { caso = null, analise = null, fundamentacao = "", tipoPeca } = dados;
    const tipo = getTipoPeca(tipoPeca);

    let p = `ESCRITÓRIO: ${escritorio}\nÁREA: ${AREA_LABELS[area]}\nPEÇA: ${tipo?.nome || tipoPeca}\n`;

    if (caso) {
        p += `\n### CASO\n`;
        if (caso.titulo) p += `Identificação: ${caso.titulo}\n`;
        if (caso.numeroCnj) p += `Processo: ${caso.numeroCnj}\n`;
        if (caso.cliente) p += `Cliente (nosso constituinte): ${caso.cliente}\n`;
        if (caso.qualificacaoCliente) p += `Qualificação do cliente: ${caso.qualificacaoCliente}\n`;
        if (caso.parteContraria) p += `Parte contrária: ${caso.parteContraria}\n`;
        if (caso.polo) p += `Nosso polo: ${caso.polo}\n`;
        if (caso.comarca) p += `Comarca / Vara: ${caso.comarca}\n`;
        if (caso.rito) p += `Rito: ${caso.rito}\n`;
        if (caso.valorCausa) p += `Valor da causa já definido: ${caso.valorCausa}\n`;
        if (caso.teseCentral) p += `Tese central definida pelo advogado: ${caso.teseCentral}\n`;
        if (caso.fatos) p += `\nFatos narrados pelo cliente:\n${enveloparDadoPassivo(caso.fatos, "fatos_narrados")}\n`;
        if (caso.documentos) p += `\nDocumentos disponíveis:\n${enveloparDadoPassivo(caso.documentos, "documentos_disponiveis")}\n`;
    }

    if (analise) {
        p += `\n### ANÁLISE DO CASO (produzida pelo analista jurídico)\n`;
        p += `Use os fatos e as teses daqui. Cada fato traz a prova e a localização — preserve essa\n`;
        p += `rastreabilidade na peça.\n`;
        p += `${JSON.stringify(recortarAnalise(analise), null, 1)}\n`;
    }

    if (fundamentacao) {
        p += `\n### MATERIAL DE FUNDAMENTAÇÃO VERIFICADO\n`;
        p += `Somente o que está abaixo pode ser citado como lei ou precedente.\n${enveloparDadoPassivo(fundamentacao, "fundamentacao_juridica")}\n`;
    } else {
        p += `\n### SEM MATERIAL DE JURISPRUDÊNCIA NESTA CHAMADA\n`;
        p += `Não cite súmula, tema ou acórdão. Onde um precedente fortaleceria a tese, escreva\n`;
        p += `[PESQUISA PENDENTE: descrição da tese a pesquisar].\n`;
    }

    return p;
}

/**
 * Reduz a análise ao que a redação precisa — evita mandar o objeto inteiro e
 * pagar tokens por indicadores de UI.
 */
function recortarAnalise(analise) {
    return {
        resumo: analise.resumo,
        fatos_alegados: analise.fatos_alegados,
        teses_juridicas: analise.teses_juridicas,
        pontos_controvertidos: analise.pontos_controvertidos,
        matriz_risco: analise.matriz_risco,
        pedidos: analise.pedidos,
        documentos_faltantes: analise.documentos_faltantes,
        informacoes_faltantes: analise.informacoes_faltantes,
        prazos_calculados: analise.prazos_calculados
    };
}

function validarEntrada(dados) {
    if (!dados) throw new Error("Dados da peça não fornecidos");
    if (!dados.tipoPeca) throw new Error("Tipo de peça é obrigatório");
    validarSegurancaCampos(dados, "dados da peça");
}

/**
 * Confere, EM CÓDIGO, o que não pode depender do modelo:
 * - requisitos formais do tipo de peça presentes no texto;
 * - marcações [DADO FALTANTE] e [verificar na fonte] que permaneceram;
 * - presença das seções obrigatórias.
 *
 * @param {string} texto - peça redigida
 * @param {string} tipoPeca
 * @returns {object} checklist
 */
export function conferirChecklist(texto = "", tipoPeca) {
    const tipo = getTipoPeca(tipoPeca);
    const normalizado = texto
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

    const secoes = (tipo?.estrutura || []).map((secao) => {
        const chave = secao
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/\s*\(.*\)\s*/g, "")
            .trim();
        const palavras = chave.split(/\s+/).filter((w) => w.length > 3);
        const presente = palavras.length
            ? palavras.every((w) => normalizado.includes(w))
            : normalizado.includes(chave);
        return { secao, presente };
    });

    const dadosFaltantes = [...texto.matchAll(/\[DADO FALTANTE:([^\]]*)\]/gi)].map((m) => m[1].trim());
    const aVerificar = [...texto.matchAll(/\[verificar na fonte\]/gi)].map(() => "citação sem fonte confirmada");
    const pesquisaPendente = [...texto.matchAll(/\[PESQUISA PENDENTE:([^\]]*)\]/gi)].map((m) => m[1].trim());

    const secoesFaltantes = secoes.filter((s) => !s.presente);

    return {
        tipo_peca: tipoPeca,
        nome_peca: tipo?.nome || tipoPeca,
        requisitos: (tipo?.checklist || []).map((c) => ({
            requisito: c.requisito,
            fundamento: c.fundamento,
            // Conferência textual é indício, não prova: quem confirma é o advogado.
            verificacao: "conferir na revisão"
        })),
        secoes,
        secoes_faltantes: secoesFaltantes.map((s) => s.secao),
        dados_faltantes: dadosFaltantes,
        citacoes_a_verificar: aVerificar.length,
        pesquisa_pendente: pesquisaPendente,
        caracteres: texto.length,
        status: "minuta",
        apto_para_exportacao:
            secoesFaltantes.length === 0 && dadosFaltantes.length === 0 && aVerificar.length === 0,
        aviso: AVISO_RESPONSABILIDADE
    };
}
