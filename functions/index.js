/**
 * Cloud Functions — o backend do Jurídico IA.
 *
 * O front é estático no GitHub Pages, então não existe servidor no mesmo domínio.
 * Estas funções são o único lugar onde a chave da Anthropic e o Admin SDK existem.
 * A regra que decide a arquitetura: a chave NUNCA vai para o navegador.
 *
 * Cada função espelha uma rota do que era `src/app/api/*` no Next:
 *   parseFile · analisarDocumento · planejarPeca · redigirPeca · revisarPeca
 */

import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { setGlobalOptions } from "firebase-functions/v2";

import { aplicarCors } from "./lib/cors.js";
import { exigirAuth, pertenceAoEscritorio } from "./lib/auth-middleware.js";
import { checkRateLimit, RATE_LIMITS } from "./lib/rate-limiter.js";
import { carregarContextoDoCaso } from "./lib/caso-loader.js";
import { adminDb } from "./lib/firebase-admin.js";
import {
    analiseRequestSchema,
    planoRequestSchema,
    redacaoRequestSchema,
    revisaoRequestSchema,
    arquivoRequestSchema
} from "./lib/validation.js";

import {
    analisarDocumento,
    planejarPeca,
    redigirPeca,
    revisarPeca,
    conferirChecklist
} from "./skills/index.js";

const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");

// southamerica-east1: mesma região do Firestore. Dado sob sigilo profissional
// não atravessa continente sem necessidade.
setGlobalOptions({
    region: "southamerica-east1",
    maxInstances: 10,
    memory: "1GiB"
});

const OPCOES_IA = {
    secrets: [ANTHROPIC_API_KEY],
    timeoutSeconds: 540,
    memory: "2GiB"
};

/** Envelope comum: CORS, autenticação, limite e tratamento de erro. */
function protegida(handler, preset) {
    return async (req, res) => {
        if (aplicarCors(req, res)) return;

        try {
            const auth = await exigirAuth(req);
            if (auth.erro) {
                res.status(auth.status).json({ error: auth.erro });
                return;
            }

            if (preset) {
                const limite = await checkRateLimit(auth.identidade.uid, preset);
                if (limite) {
                    res.status(429).set("Retry-After", String(limite.retryAfter)).json({
                        error: "Muitas requisições. Tente novamente em instantes.",
                        retryAfter: limite.retryAfter
                    });
                    return;
                }
            }

            await handler(req, res, auth.identidade);
        } catch (erro) {
            console.error("[functions]", erro);
            if (!res.headersSent) {
                const status = erro.message?.includes("Entrada rejeitada") ? 400 : 500;
                res.status(status).json({ error: erro.message || "Erro interno" });
            } else {
                res.end();
            }
        }
    };
}

function validar(schema, body, res) {
    const resultado = schema.safeParse(body);
    if (!resultado.success) {
        res.status(400).json({ error: "Dados inválidos", details: resultado.error.format() });
        return null;
    }
    return resultado.data;
}

/**
 * parseFile — extrai texto de DOCX, TXT e MD.
 *
 * PDF NÃO passa por aqui: vai nativo para a API do Claude, que lê texto e imagem
 * e devolve citação por página. A detecção de tipo de peça roda no navegador
 * (src/utils/pieceDetection.js), sobre o texto — não custa chamada nenhuma.
 */
export const parseFile = onRequest(
    { timeoutSeconds: 120 },
    protegida(async (req, res) => {
        const dados = validar(arquivoRequestSchema, req.body, res);
        if (!dados) return;

        const { nomeArquivo, base64 } = dados;
        const buffer = Buffer.from(base64, "base64");
        const nome = nomeArquivo.toLowerCase();

        let texto = "";
        if (nome.endsWith(".docx")) {
            const mammoth = await import("mammoth");
            const resultado = await mammoth.extractRawText({ buffer });
            texto = resultado.value;
        } else if (nome.endsWith(".txt") || nome.endsWith(".md")) {
            texto = buffer.toString("utf-8");
        } else {
            res.status(415).json({
                error: "Envie DOCX, TXT ou MD. PDF não passa por esta rota — ele vai direto para a análise."
            });
            return;
        }

        if (!texto?.trim()) {
            res.status(422).json({ error: "Não foi possível extrair texto do arquivo." });
            return;
        }

        res.json({ texto, caracteres: texto.length, nomeArquivo });
    }, RATE_LIMITS.parseFile)
);

/** analisarDocumento — Modo 1. */
export const analisar = onRequest(
    OPCOES_IA,
    protegida(async (req, res, identidade) => {
        const dados = validar(analiseRequestSchema, req.body, res);
        if (!dados) return;

        const { conteudo, area, casoId, caso: casoPayload, objetivo, analisePrevia } = dados;

        let caso = casoPayload || null;
        if (casoId) {
            const doc = await adminDb().collection("cases").doc(casoId).get();
            if (!doc.exists) {
                res.status(404).json({ error: "Caso não encontrado" });
                return;
            }
            if (!pertenceAoEscritorio(doc.data(), identidade.escritorioId)) {
                res.status(403).json({ error: "Caso não pertence a este escritório" });
                return;
            }
            caso = { id: doc.id, ...doc.data() };
        }

        const analise = await analisarDocumento(identidade.escritorioNome, conteudo, {
            area: caso?.area || area,
            caso,
            objetivo,
            analisePrevia
        });

        res.json({ success: true, analise });
    }, RATE_LIMITS.analisarDocumento)
);

/** planejarPeca — Modo 2, fase 1. */
export const planejar = onRequest(
    OPCOES_IA,
    protegida(async (req, res, identidade) => {
        const dados = validar(planoRequestSchema, req.body, res);
        if (!dados) return;

        const contexto = await carregarContextoDoCaso(dados, identidade.escritorioId);
        if (contexto.erro) {
            res.status(contexto.status).json({ error: contexto.erro });
            return;
        }

        const plano = await planejarPeca(identidade.escritorioNome, contexto.dados);
        res.json({ success: true, plano });
    }, RATE_LIMITS.planejarPeca)
);

/**
 * redigirPeca — Modo 2, fase 2, em streaming.
 * O advogado vê a peça nascendo; o front consome com response.body.getReader().
 */
export const redigir = onRequest(
    OPCOES_IA,
    protegida(async (req, res, identidade) => {
        const dados = validar(redacaoRequestSchema, req.body, res);
        if (!dados) return;

        const contexto = await carregarContextoDoCaso(dados, identidade.escritorioId);
        if (contexto.erro) {
            res.status(contexto.status).json({ error: contexto.erro });
            return;
        }

        res.set("Content-Type", "text/plain; charset=utf-8");
        res.set("Cache-Control", "no-store");
        res.set("X-Accel-Buffering", "no");
        res.flushHeaders?.();

        try {
            for await (const pedaco of redigirPeca(identidade.escritorioNome, contexto.dados, dados.plano)) {
                res.write(pedaco);
            }
            res.end();
        } catch (erro) {
            // O cabeçalho já foi enviado: o erro vai no corpo, marcado, para o
            // front conseguir mostrar em vez de exibir uma peça truncada em silêncio.
            console.error("[redigir] falha durante o streaming:", erro);
            res.write(`\n\n[ERRO NA GERAÇÃO: ${erro.message}]`);
            res.end();
        }
    }, RATE_LIMITS.redigirPeca)
);

/** revisarPeca — auditoria adversarial + checklist determinístico. */
export const revisar = onRequest(
    OPCOES_IA,
    protegida(async (req, res, identidade) => {
        const dados = validar(revisaoRequestSchema, req.body, res);
        if (!dados) return;

        const { texto, tipoPeca, area, caso, fontes } = dados;

        const checklist = tipoPeca ? conferirChecklist(texto, tipoPeca) : null;
        const revisao = await revisarPeca(identidade.escritorioNome, texto, { area, tipoPeca, caso, fontes });

        res.json({ success: true, checklist, revisao });
    }, RATE_LIMITS.revisarPeca)
);
