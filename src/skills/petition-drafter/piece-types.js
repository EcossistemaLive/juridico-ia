/**
 * Catálogo de tipos de peça e seus requisitos formais.
 *
 * Estrutura inspirada no catálogo do projeto Sistema de Petições (MIT), com o
 * escopo ampliado do previdenciário para as áreas em que o produto opera e com
 * o checklist formal explícito por tipo — é ele que o `enrich` roda em código
 * sobre a peça gerada, antes de liberar a exportação.
 */

export const TIPOS_PECA = {
    "peticao-inicial": {
        nome: "Petição Inicial",
        grupo: "Postulatórias",
        rito: "judicial",
        estrutura: [
            "endereçamento",
            "qualificação das partes",
            "dos fatos",
            "do direito",
            "da tutela de urgência (quando cabível)",
            "dos pedidos",
            "das provas",
            "do valor da causa",
            "fecho e assinatura"
        ],
        checklist: [
            { requisito: "Juízo a que é dirigida", fundamento: "art. 319, I, CPC" },
            { requisito: "Qualificação completa das partes", fundamento: "art. 319, II, CPC" },
            { requisito: "Fato e fundamentos jurídicos do pedido", fundamento: "art. 319, III, CPC" },
            { requisito: "Pedido com suas especificações (certo e determinado)", fundamento: "arts. 319, IV e 322, CPC" },
            { requisito: "Valor da causa", fundamento: "arts. 319, V e 291, CPC" },
            { requisito: "Provas com que pretende demonstrar a verdade dos fatos", fundamento: "art. 319, VI, CPC" },
            { requisito: "Opção pela realização ou não de audiência de conciliação", fundamento: "art. 319, VII, CPC" }
        ]
    },

    contestacao: {
        nome: "Contestação",
        grupo: "Respostas",
        rito: "judicial",
        estrutura: [
            "endereçamento",
            "preliminares",
            "prejudiciais de mérito",
            "impugnação especificada dos fatos",
            "do mérito",
            "dos pedidos",
            "das provas",
            "fecho e assinatura"
        ],
        checklist: [
            { requisito: "Toda a matéria de defesa concentrada na peça", fundamento: "art. 336, CPC" },
            { requisito: "Preliminares antes do mérito", fundamento: "art. 337, CPC" },
            { requisito: "Impugnação especificada de cada fato — o que não se impugna presume-se verdadeiro", fundamento: "art. 341, CPC" },
            { requisito: "Prejudiciais de prescrição e decadência, se houver", fundamento: "art. 487, II, CPC" },
            { requisito: "Pedido de improcedência", fundamento: "art. 336, CPC" },
            { requisito: "Protesto por provas", fundamento: "art. 336, CPC" }
        ]
    },

    replica: {
        nome: "Réplica / Impugnação à Contestação",
        grupo: "Respostas",
        rito: "judicial",
        estrutura: ["endereçamento", "enfrentamento das preliminares", "réplica ao mérito", "reafirmação dos pedidos", "das provas"],
        checklist: [
            { requisito: "Enfrentamento de cada preliminar suscitada", fundamento: "arts. 350 e 351, CPC" },
            { requisito: "Manifestação sobre documentos juntados com a contestação", fundamento: "art. 437, §1º, CPC" },
            { requisito: "Reafirmação dos pedidos da inicial", fundamento: "art. 329, CPC" }
        ]
    },

    "apelacao": {
        nome: "Apelação Cível",
        grupo: "Recursos",
        rito: "judicial",
        estrutura: ["endereçamento ao juízo a quo", "razões de apelação", "tempestividade", "dos fatos", "do direito — capítulos impugnados", "prequestionamento", "dos pedidos de reforma", "preparo"],
        checklist: [
            { requisito: "Nome e qualificação das partes", fundamento: "art. 1.010, I, CPC" },
            { requisito: "Exposição do fato e do direito", fundamento: "art. 1.010, II, CPC" },
            { requisito: "Razões do pedido de reforma ou decretação de nulidade", fundamento: "art. 1.010, III, CPC" },
            { requisito: "Pedido de nova decisão", fundamento: "art. 1.010, IV, CPC" },
            { requisito: "Demonstração de tempestividade (15 dias úteis)", fundamento: "arts. 1.003, §5º e 219, CPC" },
            { requisito: "Comprovante de preparo ou pedido de gratuidade", fundamento: "art. 1.007, CPC" },
            { requisito: "Impugnação específica dos fundamentos da sentença", fundamento: "Súmula 182 do STJ, por analogia" }
        ]
    },

    "agravo-instrumento": {
        nome: "Agravo de Instrumento",
        grupo: "Recursos",
        rito: "judicial",
        estrutura: ["endereçamento ao tribunal", "cabimento", "tempestividade", "dos fatos", "do direito", "do efeito suspensivo ou tutela recursal", "dos pedidos", "peças obrigatórias"],
        checklist: [
            { requisito: "Hipótese de cabimento do rol do art. 1.015", fundamento: "art. 1.015, CPC" },
            { requisito: "Nomes e qualificação completa das partes", fundamento: "art. 1.016, I, CPC" },
            { requisito: "Exposição do fato e do direito e razões do pedido de reforma", fundamento: "art. 1.016, II e III, CPC" },
            { requisito: "Nome e endereço dos advogados", fundamento: "art. 1.016, IV, CPC" },
            { requisito: "Peças obrigatórias do art. 1.017", fundamento: "art. 1.017, I, CPC" },
            { requisito: "Tempestividade (15 dias úteis)", fundamento: "art. 1.003, §5º, CPC" }
        ]
    },

    "embargos-declaracao": {
        nome: "Embargos de Declaração",
        grupo: "Recursos",
        rito: "judicial",
        estrutura: ["endereçamento", "tempestividade", "do vício apontado", "do prequestionamento", "do pedido"],
        checklist: [
            { requisito: "Indicação precisa de omissão, contradição, obscuridade ou erro material", fundamento: "art. 1.022, CPC" },
            { requisito: "Tempestividade (5 dias úteis)", fundamento: "art. 1.023, CPC" },
            { requisito: "Pedido de integração ou correção, não de rediscussão do mérito", fundamento: "art. 1.022, CPC" }
        ]
    },

    contrarrazoes: {
        nome: "Contrarrazões de Recurso",
        grupo: "Recursos",
        rito: "judicial",
        estrutura: ["endereçamento", "preliminares de não conhecimento", "do mérito recursal", "do pedido de manutenção"],
        checklist: [
            { requisito: "Preliminares de admissibilidade, se houver", fundamento: "art. 1.010, §1º, CPC" },
            { requisito: "Enfrentamento de cada fundamento do recurso", fundamento: "art. 1.010, §1º, CPC" },
            { requisito: "Pedido de manutenção da decisão recorrida", fundamento: "art. 1.010, §1º, CPC" }
        ]
    },

    "reclamacao-trabalhista": {
        nome: "Reclamação Trabalhista",
        grupo: "Postulatórias",
        rito: "trabalhista",
        estrutura: ["endereçamento à Vara do Trabalho", "qualificação", "dos fatos", "do direito", "dos pedidos com valores", "das provas", "do valor da causa"],
        checklist: [
            { requisito: "Designação do juízo, qualificação das partes, breve exposição dos fatos e pedido", fundamento: "art. 840, §1º, CLT" },
            { requisito: "Pedidos certos, determinados e com indicação de valor", fundamento: "art. 840, §1º, CLT" },
            { requisito: "Data e assinatura", fundamento: "art. 840, §1º, CLT" }
        ]
    },

    "mandado-seguranca": {
        nome: "Mandado de Segurança",
        grupo: "Ações constitucionais",
        rito: "judicial",
        estrutura: ["endereçamento", "qualificação do impetrante e da autoridade coatora", "dos fatos", "do direito líquido e certo", "da liminar", "dos pedidos"],
        checklist: [
            { requisito: "Indicação da autoridade coatora e da pessoa jurídica a que se vincula", fundamento: "art. 6º, Lei 12.016/2009" },
            { requisito: "Prova pré-constituída do direito líquido e certo", fundamento: "art. 6º, Lei 12.016/2009" },
            { requisito: "Prazo decadencial de 120 dias", fundamento: "art. 23, Lei 12.016/2009" }
        ]
    },

    "peticao-simples": {
        nome: "Petição Simples / Intermediária",
        grupo: "Intermediárias",
        rito: "judicial",
        estrutura: ["endereçamento", "referência ao processo", "da finalidade", "do pedido"],
        checklist: [
            { requisito: "Identificação do processo e das partes", fundamento: "prática forense" },
            { requisito: "Finalidade objetiva e pedido determinado", fundamento: "art. 322, CPC" }
        ]
    },

    "notificacao-extrajudicial": {
        nome: "Notificação Extrajudicial",
        grupo: "Extrajudicial",
        rito: "extrajudicial",
        estrutura: ["destinatário", "do fato", "da exigência", "do prazo", "da consequência do descumprimento"],
        checklist: [
            { requisito: "Identificação inequívoca do notificante e do notificado", fundamento: "prática" },
            { requisito: "Exigência clara com prazo determinado", fundamento: "art. 397, parágrafo único, CC" },
            { requisito: "Consequência jurídica do descumprimento", fundamento: "prática" }
        ]
    },

    parecer: {
        nome: "Parecer Jurídico",
        grupo: "Consultivo",
        rito: "consultivo",
        estrutura: ["da consulta", "dos fatos", "da análise jurídica", "da conclusão", "das ressalvas"],
        checklist: [
            { requisito: "Questão posta de forma objetiva", fundamento: "boa técnica" },
            { requisito: "Premissas fáticas declaradas", fundamento: "boa técnica" },
            { requisito: "Conclusão objetiva com grau de segurança declarado", fundamento: "boa técnica" },
            { requisito: "Ressalva sobre dados não verificados", fundamento: "boa técnica" }
        ]
    }
};

export const LISTA_TIPOS = Object.entries(TIPOS_PECA).map(([id, t]) => ({
    id,
    nome: t.nome,
    grupo: t.grupo,
    rito: t.rito
}));

export function getTipoPeca(id) {
    return TIPOS_PECA[id] || null;
}

/**
 * Agrupa os tipos por grupo, para os selects da interface.
 */
export function tiposPorGrupo() {
    return LISTA_TIPOS.reduce((acc, tipo) => {
        (acc[tipo.grupo] ||= []).push(tipo);
        return acc;
    }, {});
}
