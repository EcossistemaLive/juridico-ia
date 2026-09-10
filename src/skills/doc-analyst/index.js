/**
 * Doc Analyst Skill — Modo 1 (Análise de documento e de processo)
 *
 * Espelha o `cv-analyst` do RecrutaAI: recebe o documento, o caso de referência
 * e devolve JSON estruturado e auditável. O que muda é a metodologia.
 *
 * Aceita texto puro OU o PDF nativo (base64 / Files API), caso em que as
 * citações vêm ancoradas na origem pela própria API.
 */

import { callClaudeStructured, callClaudeWithDocument, MODELS } from "../claude-client/index.js";
import { SCHEMA_ANALISE_PECA, SCHEMA_REVISAO_PECA } from "./schemas.js";
import { getBaseJuridica, AREA_LABELS } from "../base-juridica/index.js";
import { calcularPrazos } from "../../lib/prazos.js";

/**
 * Analisa um documento jurídico contra o caso de referência.
 *
 * @param {string} escritorio - Nome do escritório cliente (multi-tenant)
 * @param {object|string} conteudo - Texto puro OU { base64, mimeType } OU { fileId }
 * @param {object} options
 * @param {string} options.area - Área do direito (chave de AREA_LABELS)
 * @param {object} [options.caso] - Dados do caso: partes, polo, rito, comarca, tese
 * @param {string} [options.objetivo] - O que o advogado quer desta análise
 * @param {object} [options.analisePrevia] - Análise anterior, para checar coerência
 * @returns {Promise<object>} análise enriquecida
 */
export async function analisarDocumento(escritorio, conteudo, options = {}) {
    if (!conteudo) throw new Error("Conteúdo para análise não fornecido");

    const area = AREA_LABELS[options.area] ? options.area : "civil";
    const systemPrompt = getSystemPrompt(escritorio, area, options);
    const baseJuridica = getBaseJuridica(area);
    const userPrompt = buildUserPrompt(escritorio, area, options);

    let resultado;

    const ehDocumento = conteudo?.base64 || conteudo?.fileId || conteudo?.url;

    if (ehDocumento) {
        resultado = await callClaudeWithDocument({
            systemPrompt,
            prompt: userPrompt,
            document: conteudo,
            schema: SCHEMA_ANALISE_PECA,
            model: MODELS.analise,
            citations: true,
            cacheableContext: baseJuridica,
            config: { temperature: 0.1, max_tokens: 16000 }
        });
    } else {
        resultado = await callClaudeStructured({
            systemPrompt,
            userContent: `${userPrompt}\n\n## DOCUMENTO PARA ANÁLISE\n\n${conteudo}`,
            schema: SCHEMA_ANALISE_PECA,
            model: MODELS.analise,
            cacheableContext: baseJuridica,
            toolName: "registrar_analise_juridica",
            toolDescription: "Registra a análise jurídica estruturada e auditável do documento.",
            config: { temperature: 0.1, max_tokens: 16000 }
        });
    }

    return enriquecerAnalise(resultado, area);
}

/**
 * Revisão adversarial de uma peça já redigida.
 *
 * @param {string} escritorio
 * @param {string} textoPeca
 * @param {object} options - { area, tipoPeca, fontes, caso }
 */
export async function revisarPeca(escritorio, textoPeca, options = {}) {
    if (!textoPeca?.trim()) throw new Error("Peça para revisão não fornecida");

    const area = AREA_LABELS[options.area] ? options.area : "civil";

    const systemPrompt = `Você é o revisor jurídico do escritório ${escritorio}, em auditoria adversarial.

Quem redige olha para o argumento que quer defender. Você olha para a prova e para a fonte.
Presuma que pode haver erro; confirme tudo por leitura direta do material fornecido; registre
o que está certo com a mesma disciplina com que registra o que está errado.

REGRAS DA REVISÃO
1. Toda afirmação de fato precisa apontar para um documento do caso. Se não apontar, é achado.
2. Toda citação de lei, súmula, tema ou acórdão precisa constar do material de fundamentação
   fornecido. Citação que você não consegue conferir no material é achado CRÍTICO — nunca
   confirme uma citação de memória.
3. Toda aspa de depoimento precisa existir literalmente na transcrição fornecida.
4. Confira o checklist formal do tipo de peça (${options.tipoPeca || "não informado"}).
5. A firmeza do tom deve ser proporcional à solidez da tese: tom categórico sobre tese frágil
   é achado.
6. Se faltou material para conferir alguma coisa, diga o que faltou em vez de presumir.

O campo apto_para_protocolo é false sempre que houver qualquer achado crítico ou requisito formal
não atendido.`;

    const partes = [
        `ESCRITÓRIO: ${escritorio}`,
        `ÁREA: ${AREA_LABELS[area]}`,
        options.caso ? `CASO: ${JSON.stringify(options.caso)}` : "",
        options.fontes ? `\n## MATERIAL DE FUNDAMENTAÇÃO DISPONÍVEL\n${options.fontes}` : "\n## SEM MATERIAL DE FUNDAMENTAÇÃO — toda citação jurídica da peça é inconferível e deve virar achado.",
        `\n## PEÇA A REVISAR\n${textoPeca}`
    ].filter(Boolean);

    return callClaudeStructured({
        systemPrompt,
        userContent: partes.join("\n"),
        schema: SCHEMA_REVISAO_PECA,
        model: MODELS.analise,
        cacheableContext: getBaseJuridica(area),
        toolName: "registrar_revisao",
        toolDescription: "Registra os achados da revisão adversarial da peça.",
        config: { temperature: 0.1, max_tokens: 12000 }
    });
}

/**
 * System prompt da análise — a metodologia do produto.
 */
export function getSystemPrompt(escritorio, area, options = {}) {
    return `SYSTEM PROMPT — Analista Jurídico (Ecossistema Live)

0. BLOCO DE CONFIGURAÇÃO DO ESCRITÓRIO
- Escritório: ${escritorio}
- Área do direito deste engajamento: ${AREA_LABELS[area]}
- Objetivo declarado: ${options.objetivo || "análise completa do documento"}

1. IDENTIDADE E MISSÃO
Você é o analista jurídico sênior do escritório ${escritorio}. Sua missão é transformar um
documento processual em material de trabalho verificado, hierarquizado e rastreável, para que
o advogado decida e redija sobre base sólida.

Você NÃO redige a peça e NÃO decide pelo advogado. Você prepara o terreno.

2. REGRA-RAIZ — NUNCA INVENTAR
Esta é a regra mais importante. Violá-la é pior do que omitir um argumento.
- Fatos: só o que está no documento. Nunca invente datas, valores, nomes ou acontecimentos.
- Lei: só cite dispositivo que esteja no documento analisado ou na base jurídica anexada
  a este prompt. Nunca cite artigo de memória.
- Jurisprudência: só registre súmula, tema ou acórdão que esteja CITADO NO DOCUMENTO.
  Você não tem base de jurisprudência nesta chamada. Não invente, não complete, não sugira
  precedente "no mesmo sentido".
- Depoimentos: uma aspa só existe se a frase aparecer literalmente no material.
Quando faltar dado relevante, registre em informacoes_faltantes com a descrição objetiva
do que falta. "Dado insuficiente" é uma resposta válida e esperada.

3. TRIAGEM DE ADMISSIBILIDADE (GATE CHECK)
Antes de qualquer análise de mérito, verifique prescrição, decadência, tempestividade,
legitimidade, competência, interesse de agir, preparo e representação. Se algum item for
IMPEDITIVO, isso encabeça o parecer, independentemente da qualidade das teses. Mérito bom
não compensa admissibilidade perdida.

4. PRAZOS
Extraia a data-base e o prazo aplicável. NÃO calcule dias e NÃO afirme tempestividade por
contagem própria: o cálculo em dias úteis é feito em código, fora deste prompt.

5. REGRA DE EVIDÊNCIA
Cada fato relevante recebe: a prova indicada, a localização no documento (folha, página ou
seção) e o tipo de evidência. Fato afirmado sem prova indicada é registrado como
alegacao_sem_prova — isso não é crítica, é informação de trabalho.

6. LINHA DO TEMPO E SUPERFÍCIE DE ATAQUE
Monte a cronologia dos fatos com a folha de cada data e aponte contradições (evento descoberto
antes de acontecer, notificação anterior ao contrato, prazo que não fecha). Contradição de
cronologia é o primeiro alvo do adversário.
Depois, liste que defesas, preliminares e recursos este documento convida — e como neutralizar
cada um.

7. DIAGNÓSTICO ADVERSARIAL
A matriz de risco é red-team: ataque a própria posição como se você fosse o adversário. O
objetivo é descobrir os furos antes que a parte contrária, o juiz ou o cliente descubram.
Complacência aqui é defeito grave do produto.

8. TOM
Sóbrio, técnico, direto. Sem teatralização, sem elogio ao documento, sem meta-comentário
sobre o que você vai fazer. A firmeza da afirmação deve ser proporcional à evidência.`;
}

/**
 * User prompt — os dados concretos do caso.
 */
export function buildUserPrompt(escritorio, area, options = {}) {
    const { caso = null, objetivo = "", analisePrevia = null } = options;

    let prompt = `ESCRITÓRIO: ${escritorio}\nÁREA: ${AREA_LABELS[area]}\n`;

    if (caso) {
        prompt += `\n### CASO DE REFERÊNCIA\n`;
        if (caso.titulo) prompt += `Identificação: ${caso.titulo}\n`;
        if (caso.numeroCnj) prompt += `Processo: ${caso.numeroCnj}\n`;
        if (caso.cliente) prompt += `Cliente do escritório: ${caso.cliente}\n`;
        if (caso.polo) prompt += `Nosso polo: ${caso.polo}\n`;
        if (caso.rito) prompt += `Rito: ${caso.rito}\n`;
        if (caso.comarca) prompt += `Comarca / Vara: ${caso.comarca}\n`;
        if (caso.teseCentral) prompt += `Tese central do escritório: ${caso.teseCentral}\n`;
        if (caso.observacoes) prompt += `Observações: ${caso.observacoes}\n`;
    } else {
        prompt += `\n(Sem caso de referência cadastrado. Analise o documento em si e registre em
informacoes_faltantes o que precisaria ser sabido sobre o caso.)\n`;
    }

    if (objetivo) prompt += `\n### OBJETIVO DESTA ANÁLISE\n${objetivo}\n`;

    if (analisePrevia) {
        prompt += `\n### ANÁLISE ANTERIOR DESTE CASO\n${JSON.stringify(analisePrevia).slice(0, 4000)}\n`;
        prompt += `Verifique coerência entre o que foi concluído antes e o que este documento mostra.\n`;
    }

    prompt += `\nINSTRUÇÃO DE SAÍDA: produza a análise completa conforme as regras das seções 2 a 8
do system prompt. Toda conclusão precisa ser rastreável ao documento.`;

    return prompt;
}

/**
 * Enriquecimento em código — o que não pode depender do modelo.
 * Calcula os prazos em dias úteis a partir das datas-base extraídas e consolida
 * indicadores usados pela UI e pelo parecer.
 */
export function enriquecerAnalise(resultado, area) {
    if (!resultado) return resultado;

    const prazosCalculados = calcularPrazos(resultado.prazos || []);

    const fatos = resultado.fatos_alegados || [];
    const semProva = fatos.filter((f) => f.tipo_evidencia === "alegacao_sem_prova").length;
    const documentais = fatos.filter((f) => f.tipo_evidencia === "documental").length;

    const teses = resultado.teses_juridicas || [];
    const solidas = teses.filter((t) => t.solidez === "solida").length;
    const frageis = teses.filter((t) => t.solidez === "fragil").length;

    const impeditivos = (resultado.triagem_admissibilidade?.itens || []).filter(
        (i) => i.situacao === "nao_atendido"
    );

    const contradicoes = (resultado.linha_do_tempo || []).filter(
        (e) => e.inconsistencia && e.inconsistencia.trim()
    );

    return {
        ...resultado,
        area,
        area_label: AREA_LABELS[area],
        prazos_calculados: prazosCalculados,
        prazo_mais_proximo: prazosCalculados.length
            ? prazosCalculados.reduce((a, b) => (a.diasRestantes <= b.diasRestantes ? a : b))
            : null,
        indicadores: {
            total_fatos: fatos.length,
            fatos_documentais: documentais,
            fatos_sem_prova: semProva,
            densidade_probatoria: fatos.length ? Math.round((documentais / fatos.length) * 100) : 0,
            teses_solidas: solidas,
            teses_frageis: frageis,
            documentos_faltantes: (resultado.documentos_faltantes || []).length,
            itens_impeditivos: impeditivos.length,
            contradicoes_cronologia: contradicoes.length,
            ataques_provaveis: (resultado.superficie_ataque || []).filter((a) => a.probabilidade === "alta").length
        },
        // Estado explícito: nada aqui é conclusão — é insumo para o advogado.
        status_revisao: "pendente_revisao_humana"
    };
}
