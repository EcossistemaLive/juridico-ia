/**
 * Base Jurídica — contexto doutrinário por área do direito.
 *
 * Devolve o material que entra como `cacheableContext` nas chamadas ao Claude:
 * a parte comum (processo civil, súmulas, restrições) mais o bloco da área.
 * Marcado para prompt caching, deixa de ser cobrado como entrada nova a cada
 * chamada da mesma área.
 *
 * O conteúdo vem de `conteudo.js`, que é GERADO por `npm run build:base`.
 */

import { CONTEUDO } from "./conteudo.js";

export const AREA_LABELS = {
    civil: "Cível / Responsabilidade Civil",
    consumidor: "Direito do Consumidor",
    trabalhista: "Direito do Trabalho",
    previdenciario: "Direito Previdenciário",
    tributario: "Direito Tributário",
    familia: "Família e Sucessões",
    empresarial: "Direito Empresarial",
    imobiliario: "Direito Imobiliário",
    administrativo: "Direito Administrativo",
    digital: "Direito Digital e LGPD",
    penal: "Penal e Processo Penal"
};

/** Áreas em que o produto opera com calibragem plena. */
export const AREAS_SUPORTADAS = Object.keys(AREA_LABELS);

/**
 * Aviso obrigatório em toda saída, independentemente da área.
 * Não é disclaimer de marketing: é a fronteira do produto.
 */
export const AVISO_RESPONSABILIDADE = `Este material é insumo de trabalho para profissional habilitado.
Não substitui o exame direto dos autos, a conferência das fontes em suas origens oficiais nem
o juízo do advogado, a quem cabem, com exclusividade, a decisão técnica, a assinatura da peça e
a responsabilidade profissional (Lei 8.906/1994 e Código de Ética e Disciplina da OAB).`;

/**
 * Monta o contexto doutrinário da área.
 *
 * @param {string} area - chave de AREA_LABELS
 * @param {object} [options]
 * @param {boolean} [options.incluirComum=true] - processo, súmulas e restrições
 * @param {string} [options.contextoEscritorio] - modelos e teses do escritório
 * @returns {string|undefined} - undefined quando não há base para a área
 */
export function getBaseJuridica(area, options = {}) {
    const { incluirComum = true, contextoEscritorio = "" } = options;

    const blocos = [];

    if (incluirComum && CONTEUDO.comum) {
        blocos.push(`# BASE PROCESSUAL E SUMULAR (comum a todas as áreas)\n\n${CONTEUDO.comum}`);
    }

    const daArea = CONTEUDO[area];
    if (daArea) {
        blocos.push(`# BASE DA ÁREA — ${AREA_LABELS[area] || area}\n\n${daArea}`);
    }

    if (contextoEscritorio) {
        blocos.push(`# MODELOS E TESES DO ESCRITÓRIO\n\n${contextoEscritorio}`);
    }

    if (!blocos.length) return undefined;

    blocos.push(`# REGRA DE USO DESTA BASE

A base acima é material de consulta, não é o caso concreto e não é fonte de citação automática.
- Dispositivo legal só entra na saída quando pertinente ao fato concreto analisado.
- Súmula, tema ou acórdão desta base só pode ser citado se você conferir que corresponde
  exatamente ao ponto discutido. Na dúvida, marque [verificar na fonte] e siga.
- Valores, prazos e faixas indicativas aqui são referência de mercado ou jurisprudenciais e
  mudam. Nunca os apresente como certos sem conferência.
- Esta base pode estar desatualizada em relação à legislação vigente. Legislação superveniente
  prevalece sobre ela.

${AVISO_RESPONSABILIDADE}`);

    return blocos.join("\n\n---\n\n");
}

/**
 * Diz se a área tem base carregada — usado pela UI para avisar que a análise
 * roda em regime reduzido.
 */
export function temBaseCompleta(area) {
    return Boolean(CONTEUDO[area]);
}
