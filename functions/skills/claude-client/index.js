/**
 * Claude Client — wrapper base da API Anthropic
 * Cliente centralizado para todas as interações de IA do produto jurídico.
 *
 * Mantém a mesma superfície de funções do `gemini-client` do RecrutaAI para que
 * as rotas de API e as skills não precisem conhecer o fornecedor:
 *   callClaude · streamClaude · callClaudeStructured · callClaudeWithDocument
 *   uploadToFilesApi · parseJsonResponse · removeEmojis
 */

import Anthropic from "@anthropic-ai/sdk";

/**
 * Roteamento por etapa — cada tarefa usa o modelo mais barato que a resolve bem.
 * Confira os IDs vigentes em https://platform.claude.com/docs/en/about-claude/models/overview
 */
export const MODELS = {
    // Classificação, extração de metadados, detecção de tipo de peça
    triagem: process.env.CLAUDE_MODEL_TRIAGEM || "claude-haiku-4-5-20251001",
    // Análise de autos, matriz de risco, revisão de peça
    analise: process.env.CLAUDE_MODEL_ANALISE || "claude-sonnet-5",
    // Redação de peça e parecer final
    redacao: process.env.CLAUDE_MODEL_REDACAO || "claude-opus-5"
};

const DEFAULT_CONFIG = {
    temperature: 0.2,
    max_tokens: 8192
};

let singleton = null;

function getClient() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        throw new Error("ANTHROPIC_API_KEY não configurada no servidor");
    }
    if (!singleton) {
        singleton = new Anthropic({ apiKey, maxRetries: 2 });
    }
    return singleton;
}

/**
 * Normaliza erros da API em mensagens que o usuário final entende.
 */
function traduzErro(error) {
    const status = error?.status;
    if (status === 401) return new Error("Chave da API Anthropic inválida ou revogada.");
    if (status === 429) return new Error("Limite de requisições atingido. Aguarde alguns segundos e tente novamente.");
    if (status === 400 && /credit|balance/i.test(error?.message || "")) {
        return new Error("Créditos insuficientes na conta Anthropic.");
    }
    if (status === 529) return new Error("A API está sobrecarregada no momento. Tente novamente em instantes.");
    return new Error(error?.message || "Falha na chamada ao modelo de IA");
}

import { DIRETRIZ_SEGURANCA_UNIVERSAL, filtrarVazamentoSistema } from "../../lib/prompt-guard.js";

/**
 * Monta o bloco de system prompt, marcando para cache o conteúdo estável
 * (doutrina, modelos do escritório) — o que reduz muito o custo a partir da
 * segunda peça da mesma área.
 *
 * @param {string} systemPrompt - Instrução principal
 * @param {string} [cacheableContext] - Conteúdo grande e repetido entre chamadas
 */
function buildSystem(systemPrompt, cacheableContext) {
    const blocks = [];
    if (cacheableContext) {
        blocks.push({
            type: "text",
            text: cacheableContext,
            cache_control: { type: "ephemeral" }
        });
    }
    
    // Injeta a diretriz constitucional de proteção contra injeção e sigilo em TODAS as chamadas
    const promptSeguro = systemPrompt
        ? `${DIRETRIZ_SEGURANCA_UNIVERSAL}\n\n${systemPrompt}`
        : DIRETRIZ_SEGURANCA_UNIVERSAL;

    blocks.push({ type: "text", text: promptSeguro });
    return blocks.length ? blocks : undefined;
}

/**
 * Converte o conteúdo do usuário no formato de `content blocks` da API.
 * Aceita string, array de blocos já prontos, ou um objeto de documento.
 */
function buildUserContent(userContent) {
    if (typeof userContent === "string") return [{ type: "text", text: userContent }];
    if (Array.isArray(userContent)) return userContent;
    if (userContent && typeof userContent === "object") return [userContent];
    throw new Error("Conteúdo do usuário não fornecido");
}

/**
 * Bloco de documento PDF. Aceita base64, file_id da Files API ou URL pública.
 * Com `citations` habilitado, o modelo devolve os trechos citados ancorados na
 * origem — é o que sustenta a rastreabilidade exigida no parecer jurídico.
 *
 * @param {object} doc - { base64 } | { fileId } | { url }
 * @param {boolean} citations
 */
export function documentBlock(doc, citations = true) {
    let source;
    if (doc.base64) {
        source = { type: "base64", media_type: doc.mimeType || "application/pdf", data: doc.base64 };
    } else if (doc.fileId) {
        source = { type: "file", file_id: doc.fileId };
    } else if (doc.url) {
        source = { type: "url", url: doc.url };
    } else {
        throw new Error("Documento sem fonte válida (base64, fileId ou url)");
    }

    const block = { type: "document", source };
    if (doc.title) block.title = doc.title;
    if (citations) block.citations = { enabled: true };
    return block;
}

/**
 * Chamada simples — devolve o texto gerado.
 *
 * @param {object} options
 * @param {string} options.systemPrompt
 * @param {string|array|object} options.userContent
 * @param {string} [options.model] - Um dos MODELS
 * @param {string} [options.cacheableContext]
 * @param {object} [options.config] - temperature, max_tokens
 * @returns {Promise<string>}
 */
export async function callClaude({ systemPrompt, userContent, model, cacheableContext, config = {} }) {
    const client = getClient();
    try {
        const response = await client.messages.create({
            model: model || MODELS.analise,
            ...DEFAULT_CONFIG,
            ...config,
            system: buildSystem(systemPrompt, cacheableContext),
            messages: [{ role: "user", content: buildUserContent(userContent) }]
        });

        const texto = response.content
            .filter((bloco) => bloco.type === "text")
            .map((bloco) => bloco.text)
            .join("\n")
            .trim();

        if (!texto) throw new Error("Resposta vazia da IA");
        return filtrarVazamentoSistema(texto);
    } catch (error) {
        console.error("[claude-client] callClaude:", error?.message);
        throw traduzErro(error);
    }
}

/**
 * Chamada com streaming — mesma assinatura do `streamGemini`, para as telas que
 * já consomem a resposta em tempo real.
 *
 * @yields {string} pedaços de texto
 */
export async function* streamClaude({ systemPrompt, userContent, model, cacheableContext, config = {} }) {
    const client = getClient();
    try {
        const stream = await client.messages.create({
            model: model || MODELS.redacao,
            ...DEFAULT_CONFIG,
            ...config,
            stream: true,
            system: buildSystem(systemPrompt, cacheableContext),
            messages: [{ role: "user", content: buildUserContent(userContent) }]
        });

        for await (const evento of stream) {
            if (evento.type === "content_block_delta" && evento.delta?.type === "text_delta") {
                yield evento.delta.text;
            }
        }
    } catch (error) {
        console.error("[claude-client] streamClaude:", error?.message);
        throw traduzErro(error);
    }
}

/**
 * Saída estruturada — o modelo é obrigado a chamar uma tool cujo `input_schema`
 * é o schema desejado. Substitui o `responseSchema` do Gemini.
 *
 * @param {object} options
 * @param {object} options.schema - JSON Schema do objeto de saída
 * @param {string} [options.toolName]
 * @returns {Promise<object>}
 */
export async function callClaudeStructured({
    systemPrompt,
    userContent,
    schema,
    model,
    cacheableContext,
    toolName = "registrar_resultado",
    toolDescription = "Registra o resultado estruturado da análise jurídica.",
    config = {}
}) {
    const client = getClient();
    try {
        const response = await client.messages.create({
            model: model || MODELS.analise,
            ...DEFAULT_CONFIG,
            ...config,
            system: buildSystem(systemPrompt, cacheableContext),
            messages: [{ role: "user", content: buildUserContent(userContent) }],
            tools: [{ name: toolName, description: toolDescription, input_schema: schema }],
            tool_choice: { type: "tool", name: toolName }
        });

        const bloco = response.content.find((b) => b.type === "tool_use");
        if (!bloco?.input) throw new Error("O modelo não devolveu a estrutura esperada");

        return bloco.input;
    } catch (error) {
        console.error("[claude-client] callClaudeStructured:", error?.message);
        throw traduzErro(error);
    }
}

/**
 * Análise de documento (PDF) nativo, com citações ancoradas na origem.
 * Aceita até 600 páginas / 32 MB por requisição.
 *
 * @param {object} options
 * @param {object} options.document - { base64 } | { fileId } | { url }
 * @param {string} options.prompt
 * @param {object} [options.schema] - Se informado, devolve objeto estruturado
 * @returns {Promise<string|object>}
 */
export async function callClaudeWithDocument({
    systemPrompt,
    prompt,
    document,
    schema,
    model,
    citations = true,
    cacheableContext,
    config = {}
}) {
    const conteudo = [documentBlock(document, citations), { type: "text", text: prompt }];

    if (schema) {
        return callClaudeStructured({
            systemPrompt,
            userContent: conteudo,
            schema,
            model,
            cacheableContext,
            config
        });
    }

    return callClaude({ systemPrompt, userContent: conteudo, model, cacheableContext, config });
}

/**
 * Sobe um arquivo para a Files API e devolve o file_id, para reaproveitar o
 * mesmo documento em várias chamadas sem retransmitir o conteúdo.
 *
 * @param {Buffer} buffer
 * @param {string} filename
 * @param {string} mimeType
 * @returns {Promise<string>} file_id
 */
export async function uploadToFilesApi(buffer, filename, mimeType = "application/pdf") {
    const client = getClient();
    try {
        const arquivo = await client.beta.files.upload({
            file: new File([buffer], filename, { type: mimeType })
        });
        return arquivo.id;
    } catch (error) {
        console.error("[claude-client] uploadToFilesApi:", error?.message);
        throw traduzErro(error);
    }
}

/**
 * Extrai JSON de uma resposta em texto (fallback para saídas não estruturadas).
 */
export function parseJsonResponse(texto) {
    if (!texto) return null;
    try {
        return JSON.parse(texto);
    } catch {
        const bloco = texto.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (bloco) {
            try {
                return JSON.parse(bloco[1].trim());
            } catch { /* segue */ }
        }
        const objeto = texto.match(/\{[\s\S]*\}/);
        if (objeto) {
            try {
                return JSON.parse(objeto[0]);
            } catch { /* segue */ }
        }
    }
    return null;
}

/**
 * Remove emojis — peça processual não leva emoji.
 */
export function removeEmojis(texto) {
    const regex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
    return (texto || "").replace(regex, "");
}
