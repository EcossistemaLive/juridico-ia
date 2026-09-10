/**
 * Autenticação das rotas de API — verificação real do ID token.
 *
 * O equivalente no RecrutaAI aceitava qualquer string com mais de 10 caracteres
 * como token válido ("we trust the token format"), o que deixava /api/* aberto.
 * Aqui o token é verificado pelo Admin SDK, e a identidade que sai daqui é a
 * única fonte de verdade sobre quem está chamando e de que escritório.
 */

import { adminAuth, adminDb } from "./firebase-admin.js";

/**
 * @typedef {object} Identidade
 * @property {string} uid
 * @property {string} email
 * @property {string} escritorioId
 * @property {string} role - admin | advogado | secretaria
 * @property {string} escritorioNome
 */

/**
 * Verifica o token e devolve a identidade do chamador.
 *
 * @param {Request} request
 * @returns {Promise<{ok: boolean, identidade?: Identidade, status?: number, erro?: string}>}
 */
export async function autenticar(request) {
    const header = request.headers.get("authorization") || "";

    if (!header.startsWith("Bearer ")) {
        return { ok: false, status: 401, erro: "Token de autenticação não fornecido" };
    }

    const token = header.slice(7).trim();
    if (!token) {
        return { ok: false, status: 401, erro: "Token de autenticação vazio" };
    }

    let decodificado;
    try {
        decodificado = await adminAuth().verifyIdToken(token, true);
    } catch (erro) {
        const expirado = /expired/i.test(erro?.message || "");
        return {
            ok: false,
            status: 401,
            erro: expirado ? "Sessão expirada. Entre novamente." : "Token inválido"
        };
    }

    // Claims são a fonte de verdade para papel e escritório. Se ainda não foram
    // definidas, caímos no perfil do Firestore e sinalizamos para o app corrigir.
    let escritorioId = decodificado.escritorioId;
    let role = decodificado.role;
    let escritorioNome = decodificado.escritorioNome;

    if (!escritorioId || !role) {
        const perfil = await adminDb().collection("users").doc(decodificado.uid).get();
        if (!perfil.exists) {
            return { ok: false, status: 403, erro: "Perfil de usuário não encontrado" };
        }
        const dados = perfil.data();
        escritorioId = escritorioId || dados.escritorioId;
        role = role || dados.role || "advogado";
        escritorioNome = escritorioNome || dados.escritorioNome;

        if (dados.status !== "active" || dados.paymentApproved === false) {
            return { ok: false, status: 402, erro: "Acesso pendente de aprovação" };
        }
    }

    if (!escritorioId) {
        return { ok: false, status: 403, erro: "Usuário sem escritório vinculado" };
    }

    return {
        ok: true,
        identidade: {
            uid: decodificado.uid,
            email: decodificado.email,
            escritorioId,
            escritorioNome: escritorioNome || "Escritório",
            role
        }
    };
}

/**
 * Açúcar para as rotas: devolve Response de erro, ou a identidade.
 *
 * @example
 * const auth = await exigirAuth(request);
 * if (auth.resposta) return auth.resposta;
 * const { escritorioId } = auth.identidade;
 */
export async function exigirAuth(request) {
    const resultado = await autenticar(request);

    if (!resultado.ok) {
        return {
            resposta: new Response(JSON.stringify({ error: resultado.erro }), {
                status: resultado.status || 401,
                headers: { "Content-Type": "application/json" }
            })
        };
    }

    return { identidade: resultado.identidade };
}

/**
 * Verifica se um documento pertence ao escritório do chamador.
 * Toda leitura de caso, documento ou peça no servidor passa por aqui.
 */
export function pertenceAoEscritorio(dados, escritorioId) {
    return Boolean(dados) && dados.escritorioId === escritorioId;
}
