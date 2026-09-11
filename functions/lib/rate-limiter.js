/**
 * Rate limit com contagem no Firestore.
 *
 * Substitui o `Map` em memória herdado do RecrutaAI, que não funciona quando cada
 * invocação pode cair numa instância nova — o caso de Cloud Functions e de
 * qualquer serverless. Com Opus na ponta, limite furado é exposição financeira.
 *
 * Janela fixa por minuto: barata (uma transação por chamada) e suficiente para o
 * que precisamos, que é conter abuso e engano, não moldar tráfego.
 */

import { adminDb } from "./firebase-admin.js";
import { FieldValue } from "firebase-admin/firestore";

export { RATE_LIMITS } from "./rate-limiter-presets.js";

/**
 * @param {string} uid - a chave é sempre o usuário, nunca o IP
 * @param {{limit: number, windowMs: number}} preset
 * @returns {Promise<null|{retryAfter: number}>} null quando permitido
 */
export async function checkRateLimit(uid, preset) {
    const { limit, windowMs } = preset;
    const agora = Date.now();
    const janela = Math.floor(agora / windowMs);
    const id = `${uid}_${janela}`;
    const ref = adminDb().collection("ratelimits").doc(id);

    try {
        const contagem = await adminDb().runTransaction(async (tx) => {
            const doc = await tx.get(ref);
            const atual = doc.exists ? doc.data().contagem || 0 : 0;

            if (atual >= limit) return atual + 1;

            tx.set(
                ref,
                {
                    contagem: FieldValue.increment(1),
                    uid,
                    expiraEm: new Date((janela + 1) * windowMs)
                },
                { merge: true }
            );
            return atual + 1;
        });

        if (contagem > limit) {
            const retryAfter = Math.ceil(((janela + 1) * windowMs - agora) / 1000);
            return { retryAfter: Math.max(1, retryAfter) };
        }

        return null;
    } catch (erro) {
        // Falha no limitador não pode derrubar a chamada do usuário, mas precisa
        // aparecer no log: se isso virar rotina, o limite não está protegendo nada.
        console.error("[rate-limiter] falha ao contar, seguindo sem limitar:", erro.message);
        return null;
    }
}

/**
 * Limpeza das janelas antigas. Chame por tarefa agendada ou configure TTL na
 * coleção `ratelimits` pelo campo `expiraEm` (mais barato: o Firestore apaga sozinho).
 */
export async function limparJanelasAntigas() {
    const corte = new Date(Date.now() - 3600000);
    const antigas = await adminDb().collection("ratelimits").where("expiraEm", "<", corte).limit(500).get();
    const lote = adminDb().batch();
    antigas.docs.forEach((d) => lote.delete(d.ref));
    await lote.commit();
    return antigas.size;
}
