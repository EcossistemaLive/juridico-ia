/**
 * Schemas da elaboração de peça.
 *
 * A redação acontece em duas fases, como na skill `redigir-peca` da Advocacia
 * Aberta (MIT): primeiro o PLANO (silogismo, hierarquia de teses, estrutura),
 * validado pelo advogado; só depois a REDAÇÃO. O plano é estruturado; a peça
 * sai em streaming de texto, porque o advogado precisa ver a peça nascendo.
 */

export const SCHEMA_PLANO_PECA = {
    type: "object",
    properties: {
        tipo_peca: { type: "string", description: "Identificador do tipo de peça escolhido" },
        endereçamento_proposto: { type: "string", description: "Juízo a que a peça será dirigida, com a justificativa da competência" },

        silogismo_central: {
            type: "object",
            description: "A espinha da peça em uma linha cada",
            properties: {
                premissa_maior: { type: "string", description: "A norma aplicável" },
                premissa_menor: { type: "string", description: "O fato concreto provado" },
                conclusao: { type: "string", description: "A consequência jurídica pretendida" }
            },
            required: ["premissa_maior", "premissa_menor", "conclusao"]
        },

        teses: {
            type: "array",
            description: "Teses em ordem de força — a mais sólida primeiro. Tese frágil vai depois ou sai.",
            items: {
                type: "object",
                properties: {
                    ordem: { type: "number" },
                    tese: { type: "string" },
                    fundamento_legal: { type: "string", description: "Dispositivo. Só o que constar do material fornecido." },
                    prova_de_apoio: { type: "string", description: "Qual documento ou depoimento do caso sustenta a tese" },
                    solidez: { type: "string", enum: ["solida", "discutivel", "fragil"] },
                    tom_calibrado: {
                        type: "string",
                        enum: ["categorico", "afirmativo", "ponderado", "subsidiario"],
                        description: "A firmeza do tom deve ser proporcional à solidez"
                    },
                    incluir: { type: "boolean", description: "false quando a tese enfraquece o conjunto" },
                    motivo_exclusao: { type: "string" }
                },
                required: ["ordem", "tese", "fundamento_legal", "solidez", "tom_calibrado", "incluir"]
            }
        },

        cobertura_elementos: {
            type: "array",
            description: "Para cada pedido, os requisitos legais que precisam estar alegados e provados, e o estado atual da cobertura. Não recite os requisitos — avalie a cobertura real com o material do caso.",
            items: {
                type: "object",
                properties: {
                    pedido: { type: "string" },
                    fundamento: { type: "string", description: "Norma que define os requisitos" },
                    elementos: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                elemento: { type: "string", description: "Ex.: conduta, dano, nexo causal, culpa" },
                                cobertura: {
                                    type: "string",
                                    enum: ["coberto", "fraco", "ausente"],
                                    description: "coberto = há fato e prova; fraco = alegação genérica sem prova concreta; ausente = fatal sem correção"
                                },
                                apoio: { type: "string", description: "Qual fato e qual documento sustentam este elemento" }
                            },
                            required: ["elemento", "cobertura", "apoio"]
                        }
                    }
                },
                required: ["pedido", "fundamento", "elementos"]
            }
        },

        rebates_antecipados: {
            type: "array",
            description: "O que a parte contrária vai sustentar e como a peça já responde",
            items: {
                type: "object",
                properties: {
                    argumento_adverso: { type: "string" },
                    resposta: { type: "string" },
                    onde_entra: { type: "string", description: "Em que seção da peça o rebate é integrado" }
                },
                required: ["argumento_adverso", "resposta", "onde_entra"]
            }
        },

        estrutura_proposta: {
            type: "array",
            description: "Seções da peça, na ordem, com o que entra em cada uma",
            items: {
                type: "object",
                properties: {
                    secao: { type: "string" },
                    conteudo: { type: "string" }
                },
                required: ["secao", "conteudo"]
            }
        },

        pedidos_propostos: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    pedido: { type: "string", description: "Certo e determinado" },
                    valor: { type: "string" },
                    fundamento: { type: "string" }
                },
                required: ["pedido"]
            }
        },

        valor_causa_sugerido: {
            type: "object",
            properties: {
                valor: { type: "string" },
                memoria_calculo: { type: "string", description: "Como se chegou ao valor, parcela por parcela" },
                fundamento: { type: "string", description: "Inciso do art. 292 do CPC aplicável" }
            },
            required: ["valor", "memoria_calculo"]
        },

        dados_faltantes: {
            type: "array",
            items: { type: "string" },
            description: "Tudo que a peça vai precisar e não está no material. Cada item vira [DADO FALTANTE] no texto."
        },

        bloqueios: {
            type: "array",
            description: "Impedimentos que desaconselham redigir agora (prazo vencido, ausência de documento essencial, incompetência)",
            items: {
                type: "object",
                properties: {
                    bloqueio: { type: "string" },
                    gravidade: { type: "string", enum: ["impeditivo", "grave", "atencao"] },
                    providencia: { type: "string" }
                },
                required: ["bloqueio", "gravidade", "providencia"]
            }
        },

        pode_redigir: {
            type: "boolean",
            description: "false quando houver bloqueio impeditivo — nesse caso a redação não é liberada"
        }
    },
    required: [
        "tipo_peca",
        "endereçamento_proposto",
        "silogismo_central",
        "teses",
        "cobertura_elementos",
        "estrutura_proposta",
        "pedidos_propostos",
        "dados_faltantes",
        "bloqueios",
        "pode_redigir"
    ]
};

/**
 * Schema do checklist formal aplicado sobre a peça já redigida.
 * Roda depois da redação, no `enrich`, e alimenta o estado de minuta.
 */
export const SCHEMA_CHECKLIST_FORMAL = {
    type: "object",
    properties: {
        itens: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    requisito: { type: "string" },
                    fundamento: { type: "string" },
                    atendido: { type: "boolean" },
                    onde: { type: "string", description: "Trecho da peça que atende o requisito, ou vazio" },
                    observacao: { type: "string" }
                },
                required: ["requisito", "fundamento", "atendido"]
            }
        },
        marcacoes_dado_faltante: {
            type: "array",
            items: { type: "string" },
            description: "Cada marcação [DADO FALTANTE: ...] que permaneceu no texto"
        },
        citacoes_a_verificar: {
            type: "array",
            items: { type: "string" },
            description: "Cada marcação [verificar na fonte] que permaneceu no texto"
        },
        pronta_para_revisao: { type: "boolean" }
    },
    required: ["itens", "marcacoes_dado_faltante", "citacoes_a_verificar", "pronta_para_revisao"]
};
