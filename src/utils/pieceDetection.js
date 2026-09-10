/**
 * Detecção local do tipo de peça e da área do direito — sem LLM.
 *
 * Mesmo papel do `profileDetection` no RecrutaAI: uma heurística barata que
 * pré-seleciona o tipo e a área antes de gastar chamada de modelo. É palpite
 * assistido, não classificação: a UI mostra como sugestão e o usuário confirma.
 */

const SINAIS_TIPO = {
    "peticao-inicial": ["excelentissimo", "vem propor", "acao de", "requer a citacao", "valor da causa", "dos pedidos"],
    contestacao: ["contestacao", "vem apresentar contestacao", "preliminarmente", "improcedencia", "impugna"],
    replica: ["replica", "impugnacao a contestacao", "manifestacao sobre a contestacao"],
    apelacao: ["razoes de apelacao", "apelacao civel", "sentenca recorrida", "reforma da sentenca"],
    "agravo-instrumento": ["agravo de instrumento", "decisao agravada", "efeito suspensivo"],
    "embargos-declaracao": ["embargos de declaracao", "omissao", "contradicao", "obscuridade"],
    contrarrazoes: ["contrarrazoes", "manutencao da sentenca", "recurso adverso"],
    "reclamacao-trabalhista": ["reclamacao trabalhista", "vara do trabalho", "reclamante", "reclamada", "verbas rescisorias"],
    "mandado-seguranca": ["mandado de seguranca", "autoridade coatora", "direito liquido e certo", "impetrante"],
    "notificacao-extrajudicial": ["notificacao extrajudicial", "fica notificado", "sob pena de"],
    parecer: ["parecer", "da consulta", "conclui-se", "consulente"]
};

const SINAIS_AREA = {
    trabalhista: ["clt", "vara do trabalho", "reclamante", "fgts", "horas extras", "verbas rescisorias", "vinculo empregaticio"],
    consumidor: ["cdc", "codigo de defesa do consumidor", "relacao de consumo", "vicio do produto", "fornecedor", "inversao do onus"],
    previdenciario: ["inss", "beneficio", "cnis", "carencia", "aposentadoria", "auxilio-doenca", "der", "dib"],
    tributario: ["execucao fiscal", "cda", "icms", "iss", "tributo", "lancamento", "ctn"],
    familia: ["divorcio", "alimentos", "guarda", "partilha", "inventario", "uniao estavel", "regime de bens"],
    empresarial: ["recuperacao judicial", "falencia", "sociedade limitada", "contrato social", "quotas"],
    imobiliario: ["usucapiao", "locacao", "despejo", "condominio", "matricula do imovel", "posse"],
    administrativo: ["licitacao", "improbidade", "servidor publico", "ato administrativo", "concurso publico"],
    digital: ["lgpd", "dados pessoais", "marco civil", "provedor de aplicacao", "remocao de conteudo"],
    penal: ["denuncia", "codigo penal", "inquerito", "flagrante", "habeas corpus", "reu"],
    civil: ["dano moral", "responsabilidade civil", "codigo civil", "indenizacao", "nexo causal"]
};

function normalizar(texto) {
    return (texto || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}

function pontuar(texto, mapa) {
    const t = normalizar(texto);
    return Object.entries(mapa)
        .map(([chave, sinais]) => ({
            chave,
            pontos: sinais.filter((s) => t.includes(s)).length
        }))
        .sort((a, b) => b.pontos - a.pontos);
}

/**
 * @returns {{tipo: string|null, area: string|null, confianca: number, alternativas: array}}
 */
export function detectarPeca(texto) {
    if (!texto || texto.length < 200) {
        return { tipo: null, area: null, confianca: 0, alternativas: [] };
    }

    const tipos = pontuar(texto, SINAIS_TIPO);
    const areas = pontuar(texto, SINAIS_AREA);

    const melhorTipo = tipos[0];
    const melhorArea = areas[0];
    const margem = melhorTipo.pontos - (tipos[1]?.pontos || 0);

    return {
        tipo: melhorTipo.pontos >= 2 ? melhorTipo.chave : null,
        area: melhorArea.pontos >= 2 ? melhorArea.chave : null,
        confianca: Math.min(100, melhorTipo.pontos * 15 + margem * 10),
        alternativas: tipos.filter((t) => t.pontos > 0).slice(0, 3)
    };
}

/** Extrai números de processo no padrão CNJ (NNNNNNN-DD.AAAA.J.TR.OOOO). */
export function extrairNumerosCnj(texto = "") {
    const regex = /\b\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}\b/g;
    return [...new Set(texto.match(regex) || [])];
}

export function mensagemDeteccao(deteccao) {
    if (!deteccao?.tipo && !deteccao?.area) return null;
    const partes = [];
    if (deteccao.tipo) partes.push(`tipo sugerido: ${deteccao.tipo}`);
    if (deteccao.area) partes.push(`área sugerida: ${deteccao.area}`);
    return `Detecção automática — ${partes.join(" · ")}. Confirme antes de analisar.`;
}
