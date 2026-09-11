/**
 * JSON Schemas da Análise de Documento Jurídico
 *
 * Método derivado de três fontes, reunidas e adaptadas ao Padrão Live:
 * - `organizar-caso` e `diagnosticar` (Advocacia Aberta, MIT) — sumário do caso
 *   e diagnóstico adversarial de forças e fragilidades;
 * - regra anti-invenção e marcação [DADO FALTANTE] (Sistema de Petições, MIT);
 * - gate check eliminatório e rastreabilidade de evidência (RecrutaAI).
 */

export const SCHEMA_ANALISE_PECA = {
    type: "object",
    properties: {
        identificacao: {
            type: "object",
            description: "Identificação objetiva do documento analisado",
            properties: {
                tipo_documento: {
                    type: "string",
                    description: "Petição inicial, contestação, réplica, sentença, acórdão, contrato, laudo, decisão, notificação, outro"
                },
                area_direito: {
                    type: "string",
                    description: "Área predominante: civil, consumidor, trabalhista, previdenciario, tributario, familia, empresarial, penal, administrativo, imobiliario"
                },
                numero_cnj: { type: "string", description: "Número do processo no padrão CNJ, ou 'não consta'" },
                orgao_julgador: { type: "string", description: "Vara, comarca e tribunal, ou 'não consta'" },
                data_documento: { type: "string", description: "Data do documento em AAAA-MM-DD, ou 'não consta'" },
                partes: {
                    type: "array",
                    description: "Partes identificadas no documento",
                    items: {
                        type: "object",
                        properties: {
                            nome: { type: "string" },
                            polo: { type: "string", enum: ["ativo", "passivo", "terceiro", "juizo", "indefinido"] },
                            qualificacao: { type: "string", description: "Qualificação como consta, sem completar dados ausentes" },
                            patrono: { type: "string", description: "Advogado e OAB, se constar" }
                        },
                        required: ["nome", "polo"]
                    }
                },
                valor_causa: { type: "string", description: "Valor da causa como consta no documento, ou 'não consta'" }
            },
            required: ["tipo_documento", "area_direito", "partes"]
        },

        triagem_admissibilidade: {
            type: "object",
            description: "Gate check jurídico — verificação eliminatória, apresentada antes de qualquer outra análise",
            properties: {
                status: { type: "string", enum: ["OK", "ALERTA", "IMPEDITIVO"] },
                itens: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            item: {
                                type: "string",
                                description: "prescricao, decadencia, tempestividade, legitimidade_ativa, legitimidade_passiva, competencia, interesse_de_agir, preparo, representacao"
                            },
                            situacao: { type: "string", enum: ["atendido", "risco", "nao_atendido", "sem_dado"] },
                            fundamento: { type: "string", description: "Dispositivo legal e o fato do documento que sustenta a conclusão" }
                        },
                        required: ["item", "situacao", "fundamento"]
                    }
                },
                sintese: { type: "string", description: "Se houver item IMPEDITIVO, dizer qual e por quê, em uma frase" }
            },
            required: ["status", "itens", "sintese"]
        },

        prazos: {
            type: "array",
            description: "Datas-base para contagem. NÃO calcule dias — apenas extraia a data e o tipo de prazo; o cálculo é feito em código.",
            items: {
                type: "object",
                properties: {
                    evento: { type: "string", description: "Publicação, intimação, citação, juntada de AR, ciência" },
                    data_base: { type: "string", description: "Data em AAAA-MM-DD exatamente como consta" },
                    prazo_aplicavel: { type: "string", description: "Ex: 15 dias úteis para contestar (art. 335 CPC)" },
                    fonte: { type: "string", description: "Onde no documento essa data aparece (folha, seção)" }
                },
                required: ["evento", "data_base", "prazo_aplicavel"]
            }
        },

        resumo: {
            type: "string",
            description: "Leitura de 30 segundos: do que se trata, qual a pretensão, qual o maior risco e qual a recomendação"
        },

        sumario_documento: {
            type: "string",
            description: "Parágrafo denso descrevendo a estrutura e o conteúdo do documento, na ordem em que aparece"
        },

        fatos_alegados: {
            type: "array",
            description: "Cada afirmação de fato relevante, com a prova que a sustenta. Regra de evidência estrita.",
            items: {
                type: "object",
                properties: {
                    fato: { type: "string", description: "O fato afirmado, em uma frase" },
                    prova_indicada: { type: "string", description: "Documento, depoimento ou anexo apontado como prova; 'nenhuma' se a afirmação vier desacompanhada" },
                    localizacao: { type: "string", description: "Folha, página ou seção onde o fato aparece" },
                    tipo_evidencia: {
                        type: "string",
                        enum: ["documental", "testemunhal", "pericial", "confissao", "alegacao_sem_prova", "inferencia"]
                    },
                    controvertido: { type: "boolean", description: "Se o fato é contestado pela outra parte no material analisado" }
                },
                required: ["fato", "prova_indicada", "localizacao", "tipo_evidencia"]
            }
        },

        teses_juridicas: {
            type: "array",
            description: "Teses sustentadas no documento, com o fundamento legal invocado",
            items: {
                type: "object",
                properties: {
                    tese: { type: "string" },
                    fundamento_legal: { type: "string", description: "Dispositivo citado no documento. Nunca inventar artigo que não esteja no texto." },
                    precedente_citado: { type: "string", description: "Súmula, tema ou acórdão citado NO DOCUMENTO; 'nenhum' se não houver" },
                    solidez: { type: "string", enum: ["solida", "discutivel", "fragil"] },
                    observacao: { type: "string", description: "Por que a tese é sólida ou frágil, à luz do material" }
                },
                required: ["tese", "fundamento_legal", "solidez"]
            }
        },

        pontos_controvertidos: {
            type: "array",
            items: { type: "string" },
            description: "Onde a lide efetivamente está — o que precisa ser provado ou decidido"
        },

        linha_do_tempo: {
            type: "array",
            description: "Datas relevantes em ordem cronológica. Contradição de linha do tempo é usada contra a parte — encontre antes que o adversário encontre.",
            items: {
                type: "object",
                properties: {
                    data: { type: "string", description: "AAAA-MM-DD ou a data como consta, se aproximada" },
                    evento: { type: "string" },
                    fonte: { type: "string", description: "Folha ou documento em que a data aparece" },
                    inconsistencia: {
                        type: "string",
                        description: "Preencha apenas se este evento contradiz outro (ex.: descoberta anterior ao fato). Vazio quando coerente."
                    }
                },
                required: ["data", "evento", "fonte"]
            }
        },

        superficie_ataque: {
            type: "array",
            description: "Que defesas, preliminares e recursos este documento convida a parte contrária a opor",
            items: {
                type: "object",
                properties: {
                    ataque: { type: "string", description: "Ex.: incompetência relativa, ilegitimidade passiva, prescrição quinquenal" },
                    probabilidade: { type: "string", enum: ["alta", "media", "baixa"] },
                    como_neutralizar: { type: "string" }
                },
                required: ["ataque", "probabilidade", "como_neutralizar"]
            }
        },

        matriz_risco: {
            type: "object",
            description: "Diagnóstico adversarial, sem complacência: ataca a própria posição como se fosse o adversário",
            properties: {
                forcas: { type: "array", items: { type: "string" }, description: "Pontos fortes da nossa posição, com a evidência que os sustenta" },
                vulnerabilidades: { type: "array", items: { type: "string" }, description: "Onde a nossa posição pode ser atacada" },
                teses_adversas_provaveis: { type: "array", items: { type: "string" }, description: "O que a parte contrária provavelmente vai sustentar" },
                cenario_acordo: { type: "string", description: "Faixa e condições em que um acordo seria racional, ou por que não cabe" }
            },
            required: ["forcas", "vulnerabilidades", "teses_adversas_provaveis"]
        },

        pedidos: {
            type: "array",
            description: "Pedidos formulados no documento",
            items: {
                type: "object",
                properties: {
                    pedido: { type: "string" },
                    valor: { type: "string", description: "Valor atribuído, se houver" },
                    viabilidade: { type: "string", enum: ["alta", "media", "baixa", "sem_dado"] },
                    observacao: { type: "string" }
                },
                required: ["pedido", "viabilidade"]
            }
        },

        documentos_faltantes: {
            type: "array",
            items: { type: "string" },
            description: "O que precisaria existir nos autos para sustentar a tese e não está — o item mais acionável do parecer"
        },

        informacoes_faltantes: {
            type: "array",
            items: { type: "string" },
            description: "Dados essenciais ausentes no material. Use quando não houver base para concluir, em vez de estimar."
        },

        recomendacao: {
            type: "string",
            enum: ["CONTESTAR", "CONCILIAR", "RECORRER", "NAO_RECORRER", "AJUIZAR", "AGUARDAR", "DILIGENCIAR"]
        },

        justificativa: {
            type: "string",
            description: "Parecer conclusivo, assertivo, sem inflar confiança que a evidência não sustenta"
        },

        proximos_passos: {
            type: "array",
            description: "Providências concretas, na ordem em que devem ser tomadas",
            items: {
                type: "object",
                properties: {
                    ordem: { type: "number" },
                    acao: { type: "string" },
                    prazo_sugerido: { type: "string" }
                },
                required: ["ordem", "acao"]
            }
        }
    },
    required: [
        "identificacao",
        "triagem_admissibilidade",
        "prazos",
        "resumo",
        "sumario_documento",
        "fatos_alegados",
        "teses_juridicas",
        "pontos_controvertidos",
        "linha_do_tempo",
        "superficie_ataque",
        "matriz_risco",
        "documentos_faltantes",
        "informacoes_faltantes",
        "recomendacao",
        "justificativa"
    ]
};

/**
 * Schema da revisão adversarial de peça (skill `revisar-peca`, adaptada).
 * Confere cada afirmação contra a fonte e devolve achados priorizados.
 */
export const SCHEMA_REVISAO_PECA = {
    type: "object",
    properties: {
        resumo_revisao: { type: "string", description: "O que foi conferido e o veredito geral em duas frases" },
        totais: {
            type: "object",
            properties: {
                referencias_documentais: { type: "number" },
                citacoes_depoimento: { type: "number" },
                citacoes_juridicas: { type: "number" }
            },
            required: ["referencias_documentais", "citacoes_depoimento", "citacoes_juridicas"]
        },
        achados: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    gravidade: { type: "string", enum: ["critico", "alto", "medio", "baixo"] },
                    categoria: {
                        type: "string",
                        enum: [
                            "fato_sem_prova",
                            "citacao_nao_verificada",
                            "citacao_impertinente",
                            "erro_de_direito",
                            "incoerencia_interna",
                            "pedido_indeterminado",
                            "requisito_formal_ausente",
                            "tom_desproporcional",
                            "dado_faltante"
                        ]
                    },
                    trecho: { type: "string", description: "Citação literal do ponto da peça" },
                    problema: { type: "string" },
                    acao_recomendada: { type: "string" }
                },
                required: ["gravidade", "categoria", "trecho", "problema", "acao_recomendada"]
            }
        },
        checklist_formal: {
            type: "array",
            description: "Requisitos formais do tipo de peça (ex.: art. 319 do CPC para a inicial)",
            items: {
                type: "object",
                properties: {
                    requisito: { type: "string" },
                    atendido: { type: "boolean" },
                    observacao: { type: "string" }
                },
                required: ["requisito", "atendido"]
            }
        },
        apto_para_protocolo: {
            type: "boolean",
            description: "false sempre que houver qualquer achado crítico ou requisito formal não atendido"
        }
    },
    required: ["resumo_revisao", "totais", "achados", "checklist_formal", "apto_para_protocolo"]
};
