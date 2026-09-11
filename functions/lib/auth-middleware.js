/**
 * Autenticação das functions — verificação real do ID token.
 *
 * O equivalente no RecrutaAI aceitava qualquer string com mais de 10 caracteres
 * como token válido ("we trust the token format"), o que deixava /api/* aberto.
 * Aqui o token é verificado pelo Admin SDK, e a identidade que sai daqui é a
 * única fonte de verdade sobre quem chamou e de que escritório.
 *
 * Assinatura em estilo Express (req/res), porque é o que Cloud Functions entrega.
 */

import { adminAuth, adminDb } from "./firebase-admin.js";

/**
 * @typedef {object} Identidade
 * @property {string} uid
 * @property {string} email
 * @property {string} escritorioId
 * @property {string} escritorioNome
 * @property {string} role - plataforma_admin | admin | advogado | secretaria
 */

/**
 * @param {import("express").Request} req
 * @returns {Promise<{identidade?: Identidade, erro?: string, status?: number}>}
 */
export async function exigirAuth(req) {
    const header = req.headers.authorization || "";

    if (!header.startsWith("Bearer ")) {
        return { erro: "Token de autenticação não fornecido", status: 401 };
    }

    const token = header.slice(7).trim();
    if (!token) return { erro: "Token de autenticação vazio", status: 401 };

    let decodificado;
    try {
        decodificado = await adminAuth().verifyIdToken(token, true);
    } catch (erro) {
        const expirado = /expired/i.test(erro?.message || "");
        return {
            erro: expirado ? "Sessão expirada. Entre novamente." : "Token inválido",
            status: 401
        };
    }

    // Claims são a fonte de verdade para papel e escritório. Se ainda não foram
    // gravadas, caímos no perfil do Firestore — e o app precisa forçar a renovação
    // do token (getIdToken(true)) para as claims passarem a valer.
    let { escritorioId, role, escritorioNome } = decodificado;

    if (!escritorioId || !role) {
        const perfil = await adminDb().collection("users").doc(decodificado.uid).get();
        if (!perfil.exists) return { erro: "Perfil de usuário não encontrado", status: 403 };

        const dados = perfil.data();
        escritorioId = escritorioId || dados.escritorioId;
        role = role || dados.role || "advogado";
        escritorioNome = escritorioNome || dados.escritorioNome;

        if (dados.status !== "active" || dados.paymentApproved === false) {
            return { erro: "Acesso pendente de aprovação", status: 402 };
        }
    }

    if (!escritorioId) return { erro: "Usuário sem escritório vinculado", status: 403 };

    return {
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
 * Verifica se um documento pertence ao escritório do chamador.
 * Toda leitura de caso, documento ou peça no servidor passa por aqui.
 */
export function pertenceAoEscritorio(dados, escritorioId) {
    return Boolean(dados) && dados.escritorioId === escritorioId;
}
