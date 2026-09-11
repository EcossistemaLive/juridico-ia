/**
 * Cálculo de prazos processuais — feito em CÓDIGO, nunca pela IA.
 *
 * A IA extrai a data-base e o prazo aplicável do documento; a contagem acontece
 * aqui. Um prazo errado não é um parecer fraco: é preclusão.
 *
 * Regra do CPC/2015 (art. 219): prazos processuais em dias ÚTEIS.
 * Regra da CLT (art. 775, com a Lei 13.467/2017): também em dias úteis.
 * Prazos de direito material (prescrição, decadência) correm em dias corridos —
 * por isso o tipo de contagem é explícito em cada chamada.
 *
 * ATENÇÃO: feriados forenses variam por tribunal e por comarca. A lista abaixo
 * cobre os feriados nacionais e o recesso forense (art. 220 do CPC). Feriados
 * estaduais, municipais e suspensões locais precisam ser cadastrados por
 * escritório em `feriadosExtras` antes do go-live.
 */

/** Feriados nacionais de data fixa (MM-DD). */
const FERIADOS_FIXOS = [
    "01-01", // Confraternização Universal
    "04-21", // Tiradentes
    "05-01", // Dia do Trabalho
    "09-07", // Independência
    "10-12", // Nossa Senhora Aparecida
    "11-02", // Finados
    "11-15", // Proclamação da República
    "11-20", // Consciência Negra (feriado nacional desde a Lei 14.759/2023)
    "12-25"  // Natal
];

/**
 * Recesso forense: 20/12 a 20/01 (art. 220 do CPC) — os prazos ficam suspensos.
 */
function noRecessoForense(data) {
    const mes = data.getMonth() + 1;
    const dia = data.getDate();
    return (mes === 12 && dia >= 20) || (mes === 1 && dia <= 20);
}

/**
 * Calcula a Páscoa (algoritmo de Meeus/Jones/Butcher) para derivar Carnaval,
 * Sexta-feira Santa e Corpus Christi, que são pontos facultativos ou feriados
 * forenses na maior parte dos tribunais.
 */
function feriadosMoveis(ano) {
    const a = ano % 19;
    const b = Math.floor(ano / 100);
    const c = ano % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const mes = Math.floor((h + l - 7 * m + 114) / 31);
    const dia = ((h + l - 7 * m + 114) % 31) + 1;

    const pascoa = new Date(Date.UTC(ano, mes - 1, dia));
    const somaDias = (base, dias) => new Date(base.getTime() + dias * 86400000);

    return [
        somaDias(pascoa, -48), // Segunda de Carnaval
        somaDias(pascoa, -47), // Terça de Carnaval
        somaDias(pascoa, -2),  // Sexta-feira Santa
        somaDias(pascoa, 60)   // Corpus Christi
    ].map(formatarISO);
}

function formatarISO(data) {
    return data.toISOString().slice(0, 10);
}

/**
 * @param {Date} data
 * @param {string[]} feriadosExtras - datas ISO (AAAA-MM-DD) do tribunal/comarca
 */
export function ehDiaUtil(data, feriadosExtras = []) {
    const diaSemana = data.getUTCDay();
    if (diaSemana === 0 || diaSemana === 6) return false;
    if (noRecessoForense(data)) return false;

    const iso = formatarISO(data);
    if (feriadosExtras.includes(iso)) return false;
    if (FERIADOS_FIXOS.includes(iso.slice(5))) return false;
    if (feriadosMoveis(data.getUTCFullYear()).includes(iso)) return false;

    return true;
}

/**
 * Soma dias úteis a partir de uma data-base.
 * A contagem exclui o dia do começo e inclui o do vencimento (art. 224 do CPC);
 * quando a data-base cai em dia não útil, o termo inicial é o primeiro dia útil
 * seguinte (art. 224, §1º).
 *
 * @param {string|Date} dataBase - AAAA-MM-DD
 * @param {number} dias
 * @param {object} [options] - { uteis = true, feriadosExtras = [] }
 * @returns {Date}
 */
export function somarDias(dataBase, dias, options = {}) {
    const { uteis = true, feriadosExtras = [] } = options;
    let data = typeof dataBase === "string" ? new Date(`${dataBase}T00:00:00Z`) : new Date(dataBase);
    if (Number.isNaN(data.getTime())) throw new Error(`Data-base inválida: ${dataBase}`);

    if (!uteis) {
        return new Date(data.getTime() + dias * 86400000);
    }

    // Termo inicial: primeiro dia útil a partir da data-base
    while (!ehDiaUtil(data, feriadosExtras)) {
        data = new Date(data.getTime() + 86400000);
    }

    let restantes = dias;
    while (restantes > 0) {
        data = new Date(data.getTime() + 86400000);
        if (ehDiaUtil(data, feriadosExtras)) restantes -= 1;
    }

    return data;
}

/**
 * Extrai o número de dias de uma descrição textual do prazo.
 * Ex: "15 dias úteis para contestar (art. 335 CPC)" -> { dias: 15, uteis: true }
 */
export function interpretarPrazo(texto = "") {
    const t = texto.toLowerCase();
    const match = t.match(/(\d{1,3})\s*dias?/);
    if (!match) return null;

    const dias = parseInt(match[1], 10);
    // "dias corridos" e prazos de direito material não seguem a regra de dias úteis
    const corridos = /corrid|prescri|decad|material/.test(t);

    return { dias, uteis: !corridos };
}

/**
 * Recebe os prazos extraídos pela IA e devolve as datas calculadas.
 * Nunca confia no cálculo do modelo — só na data-base que ele leu do documento.
 *
 * @param {Array<{evento, data_base, prazo_aplicavel, fonte}>} prazos
 * @param {object} [options] - { feriadosExtras, hoje }
 */
export function calcularPrazos(prazos = [], options = {}) {
    const { feriadosExtras = [], hoje = new Date() } = options;
    const referencia = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate()));

    return prazos
        .map((p) => {
            const interpretado = interpretarPrazo(p.prazo_aplicavel);
            if (!interpretado || !p.data_base || !/^\d{4}-\d{2}-\d{2}$/.test(p.data_base)) {
                return {
                    ...p,
                    calculado: false,
                    motivo: !interpretado
                        ? "Não foi possível identificar o número de dias no prazo informado"
                        : "Data-base ausente ou fora do formato AAAA-MM-DD",
                    vencimento: null,
                    diasRestantes: null
                };
            }

            let vencimento;
            try {
                vencimento = somarDias(p.data_base, interpretado.dias, {
                    uteis: interpretado.uteis,
                    feriadosExtras
                });
            } catch (erro) {
                return { ...p, calculado: false, motivo: erro.message, vencimento: null, diasRestantes: null };
            }

            const diasRestantes = Math.round((vencimento - referencia) / 86400000);

            return {
                ...p,
                calculado: true,
                contagem: interpretado.uteis ? "dias úteis" : "dias corridos",
                dias: interpretado.dias,
                vencimento: formatarISO(vencimento),
                diasRestantes,
                situacao: diasRestantes < 0 ? "vencido" : diasRestantes <= 3 ? "critico" : diasRestantes <= 7 ? "atencao" : "normal",
                aviso: "Confira feriados locais e suspensões do tribunal antes de confiar nesta data."
            };
        })
        .sort((a, b) => (a.diasRestantes ?? 9999) - (b.diasRestantes ?? 9999));
}
