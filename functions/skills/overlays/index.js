/**
 * Overlays — camadas que se aplicam sobre qualquer peça.
 *
 * Padrão adaptado do Themis Legal Framework (MIT), que separa o conhecimento
 * do TIPO de peça (universal) do conhecimento do FORO e do ESTILO (variável).
 * No RecrutaAI o equivalente era a "família de vaga"; aqui são dois pacotes
 * independentes, guardados por escritório no Firestore:
 *
 *   pacote de foro    -> como a peça precisa ser para não voltar do cartório
 *   pacote de estilo  -> como a peça precisa soar para parecer daquele escritório
 *
 * É o pacote de estilo que faz a peça sair na voz do escritório, e é ele que
 * acumula valor com o uso.
 */

/**
 * Pacote de foro — preenchido por comarca/tribunal onde o escritório atua.
 * Campos vazios não travam nada: o que falta vira marcação na peça.
 */
export const PACOTE_FORO_MODELO = {
    id: "",
    nome: "",                       // Ex.: "TJGO — Comarca de Goiânia — Varas Cíveis"
    justica: "",                    // estadual | federal | trabalho | eleitoral
    tribunal: "",                   // TJGO, TRT-18, TRF-1...
    comarca: "",
    enderecamentos: {},             // { "peticao-inicial": "EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO DA ___ VARA CÍVEL DA COMARCA DE GOIÂNIA — GO", ... }
    exigencias: [],                 // Ex.: "juntada de comprovante de endereço", "declaração de hipossuficiência assinada"
    formatacao: {
        fonte: "",
        tamanho: "",
        entrelinhas: "",
        margens: "",
        limitePaginas: ""
    },
    peticionamento: "",             // PJe, Projudi, eproc, e-SAJ — muda anexos e nomenclatura
    rejeicoes_comuns: [],           // O que o cartório costuma devolver
    observacoes: ""
};

/**
 * Pacote de estilo — a voz do escritório.
 */
export const PACOTE_ESTILO_MODELO = {
    id: "",
    nome: "",
    tom: "",                        // sóbrio | técnico | combativo | conciliador
    palavras_proibidas: [],         // Ex.: "data venia" em excesso, "nobre julgador", latinismo decorativo
    verbos_preferidos: [],
    como_nomear_partes: "",         // nomes próprios | Autor/Réu | Reclamante/Reclamada
    titulos_secao: "",              // CAIXA ALTA | Versalete | Numerada
    paragrafo: {
        tamanhoIdeal: "",
        umaIdeiaPorParagrafo: true,
        formatoData: "",            // 15 de março de 2026 | 15/03/2026
        formatoValor: ""            // R$ 2.300.000,00 (dois milhões e trezentos mil reais)
    },
    formato_pedidos: "",            // alíneas a), b) | numerado 1., 2.
    fecho_padrao: "",               // "Termos em que pede deferimento."
    assinatura: "",
    observacoes: ""
};

/**
 * Converte os pacotes em instrução de prompt.
 * Só entra no prompt o que estiver preenchido — pacote vazio não polui contexto.
 *
 * @param {object} [foro]
 * @param {object} [estilo]
 * @returns {string}
 */
export function montarOverlays(foro, estilo) {
    const blocos = [];

    if (foro && (foro.tribunal || foro.comarca || Object.keys(foro.enderecamentos || {}).length)) {
        const linhas = ["## OVERLAY DE FORO — requisitos locais"];
        if (foro.nome) linhas.push(`Foro: ${foro.nome}`);
        if (foro.justica) linhas.push(`Justiça: ${foro.justica}`);
        if (foro.peticionamento) linhas.push(`Sistema de peticionamento: ${foro.peticionamento}`);

        const ends = Object.entries(foro.enderecamentos || {});
        if (ends.length) {
            linhas.push("Endereçamentos exatos (use literalmente o que corresponder ao tipo de peça):");
            ends.forEach(([tipo, texto]) => linhas.push(`- ${tipo}: ${texto}`));
        }
        if (foro.exigencias?.length) {
            linhas.push("Exigências locais que a peça precisa atender:");
            foro.exigencias.forEach((e) => linhas.push(`- ${e}`));
        }
        if (foro.rejeicoes_comuns?.length) {
            linhas.push("Motivos frequentes de devolução neste foro — evite todos:");
            foro.rejeicoes_comuns.forEach((r) => linhas.push(`- ${r}`));
        }
        const f = foro.formatacao || {};
        const fmt = [f.fonte, f.tamanho, f.entrelinhas, f.margens, f.limitePaginas].filter(Boolean);
        if (fmt.length) linhas.push(`Formatação: ${fmt.join(" · ")}`);
        if (foro.observacoes) linhas.push(`Observações: ${foro.observacoes}`);

        blocos.push(linhas.join("\n"));
    } else {
        blocos.push(`## OVERLAY DE FORO — não configurado
Não presuma exigências locais. Use o endereçamento genérico do rito e escreva
[FORO: conferir exigências locais e endereçamento exato] logo abaixo do endereçamento.`);
    }

    if (estilo && (estilo.tom || estilo.como_nomear_partes || estilo.fecho_padrao)) {
        const linhas = ["## OVERLAY DE ESTILO — voz do escritório"];
        if (estilo.tom) linhas.push(`Tom: ${estilo.tom}`);
        if (estilo.como_nomear_partes) linhas.push(`Como nomear as partes: ${estilo.como_nomear_partes}`);
        if (estilo.titulos_secao) linhas.push(`Títulos de seção: ${estilo.titulos_secao}`);
        if (estilo.palavras_proibidas?.length) {
            linhas.push(`Proibido escrever: ${estilo.palavras_proibidas.join(", ")}`);
        }
        if (estilo.verbos_preferidos?.length) {
            linhas.push(`Verbos preferidos: ${estilo.verbos_preferidos.join(", ")}`);
        }
        const p = estilo.paragrafo || {};
        if (p.tamanhoIdeal) linhas.push(`Tamanho de parágrafo: ${p.tamanhoIdeal}`);
        if (p.umaIdeiaPorParagrafo) linhas.push("Uma ideia por parágrafo.");
        if (p.formatoData) linhas.push(`Formato de data: ${p.formatoData}`);
        if (p.formatoValor) linhas.push(`Formato de valor: ${p.formatoValor}`);
        if (estilo.formato_pedidos) linhas.push(`Formato dos pedidos: ${estilo.formato_pedidos}`);
        if (estilo.fecho_padrao) linhas.push(`Fecho padrão (use exatamente): ${estilo.fecho_padrao}`);
        if (estilo.assinatura) linhas.push(`Bloco de assinatura: ${estilo.assinatura}`);
        if (estilo.observacoes) linhas.push(`Observações: ${estilo.observacoes}`);

        blocos.push(linhas.join("\n"));
    }

    return blocos.join("\n\n");
}

/**
 * Pacote de foro inicial sugerido para a Justiça Estadual de Goiás — ponto de
 * partida para o piloto, a ser conferido e ajustado pelo escritório.
 */
export const FORO_TJGO_GOIANIA = {
    id: "tjgo-goiania-civel",
    nome: "TJGO — Comarca de Goiânia — Varas Cíveis",
    justica: "estadual",
    tribunal: "TJGO",
    comarca: "Goiânia — GO",
    enderecamentos: {
        "peticao-inicial":
            "EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO DA ___ª VARA CÍVEL DA COMARCA DE GOIÂNIA — ESTADO DE GOIÁS",
        contestacao:
            "EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO DA ___ª VARA CÍVEL DA COMARCA DE GOIÂNIA — ESTADO DE GOIÁS",
        apelacao:
            "EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO DA ___ª VARA CÍVEL DA COMARCA DE GOIÂNIA — ESTADO DE GOIÁS\n(Razões dirigidas ao Egrégio Tribunal de Justiça do Estado de Goiás)"
    },
    exigencias: [],
    formatacao: { fonte: "", tamanho: "", entrelinhas: "", margens: "", limitePaginas: "" },
    peticionamento: "Projudi / PJe — confirmar o sistema da vara antes do protocolo",
    rejeicoes_comuns: [],
    observacoes:
        "Pacote inicial não conferido. Antes do go-live, o escritório precisa validar endereçamento, sistema de peticionamento e exigências de cada vara."
};
