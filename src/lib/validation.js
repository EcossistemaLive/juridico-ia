import { z } from "zod";
import { AREAS_SUPORTADAS } from "../skills/base-juridica/index.js";
import { TIPOS_PECA } from "../skills/petition-drafter/piece-types.js";

export const AREAS = AREAS_SUPORTADAS;
export const TIPOS = Object.keys(TIPOS_PECA);

export const POLOS = ["ativo", "passivo", "terceiro", "consultivo"];

/** Documento enviado para análise: texto puro, PDF em base64 ou arquivo na Files API. */
const conteudoSchema = z.union([
    z.string().min(20, "Texto muito curto para análise"),
    z.object({
        base64: z.string().min(100),
        mimeType: z.string().default("application/pdf"),
        title: z.string().optional()
    }),
    z.object({ fileId: z.string().min(3), title: z.string().optional() }),
    z.object({ url: z.string().url(), mimeType: z.string().optional(), title: z.string().optional() })
]);

export const casoSchema = z.object({
    titulo: z.string().min(2).optional(),
    numeroCnj: z.string().optional(),
    cliente: z.string().optional(),
    qualificacaoCliente: z.string().optional(),
    parteContraria: z.string().optional(),
    polo: z.enum(["ativo", "passivo", "terceiro", "consultivo"]).optional(),
    area: z.enum(AREAS_SUPORTADAS).optional(),
    rito: z.string().optional(),
    comarca: z.string().optional(),
    valorCausa: z.string().optional(),
    teseCentral: z.string().optional(),
    fatos: z.string().optional(),
    documentos: z.string().optional(),
    observacoes: z.string().optional()
});

export const analiseRequestSchema = z.object({
    conteudo: conteudoSchema,
    area: z.enum(AREAS_SUPORTADAS).default("civil"),
    casoId: z.string().optional(),
    caso: casoSchema.optional(),
    objetivo: z.string().max(2000).optional(),
    analisePrevia: z.any().optional()
});

export const planoRequestSchema = z.object({
    tipoPeca: z.enum(Object.keys(TIPOS_PECA)),
    area: z.enum(AREAS_SUPORTADAS).default("civil"),
    casoId: z.string().optional(),
    caso: casoSchema.optional(),
    analise: z.any().optional(),
    fundamentacao: z.string().max(200000).optional(),
    modelosEscritorio: z.string().max(200000).optional(),
    instrucoes: z.string().max(4000).optional(),
    foro: z.any().optional(),
    estilo: z.any().optional()
});

export const redacaoRequestSchema = planoRequestSchema.extend({
    plano: z.any().optional()
});

export const revisaoRequestSchema = z.object({
    texto: z.string().min(200, "Peça muito curta para revisão"),
    tipoPeca: z.enum(Object.keys(TIPOS_PECA)).optional(),
    area: z.enum(AREAS_SUPORTADAS).default("civil"),
    caso: casoSchema.optional(),
    fontes: z.string().max(200000).optional()
});
