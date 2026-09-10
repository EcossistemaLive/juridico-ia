/**
 * Firebase Admin SDK — uso EXCLUSIVO no servidor (route handlers).
 *
 * Correção deliberada de uma dívida herdada do RecrutaAI, onde o SDK cliente era
 * importado dentro de rota de API: no servidor ele roda sem contexto de
 * autenticação, então ou as regras bloqueiam (e o erro é engolido) ou as regras
 * precisam ser afrouxadas. Num produto que guarda material coberto por sigilo
 * profissional, o isolamento entre escritórios não pode depender disso.
 *
 * Regra da casa: SDK cliente só no navegador; Admin SDK só aqui.
 */

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function credencial() {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
        throw new Error(
            "Credenciais do Firebase Admin ausentes. Configure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY."
        );
    }

    return cert({
        projectId,
        clientEmail,
        // A chave vem com \n escapados nas variáveis de ambiente do Netlify.
        privateKey: privateKey.replace(/\\n/g, "\n")
    });
}

function app() {
    return getApps().length ? getApps()[0] : initializeApp({ credential: credencial() });
}

export function adminAuth() {
    return getAuth(app());
}

export function adminDb() {
    return getFirestore(app());
}

/**
 * Define as custom claims de um usuário — substitui o admin hardcoded no código.
 * @param {string} uid
 * @param {object} claims - { role: 'admin' | 'advogado' | 'secretaria', escritorioId }
 */
export async function definirClaims(uid, claims) {
    await adminAuth().setCustomUserClaims(uid, claims);
}
