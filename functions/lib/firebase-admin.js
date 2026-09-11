/**
 * Firebase Admin SDK — uso exclusivo dentro das Cloud Functions.
 *
 * Dentro do ambiente de functions as credenciais são automáticas (Application
 * Default Credentials): não existe chave privada em variável de ambiente, e isso
 * é uma vantagem de segurança sobre o desenho anterior, em que a chave da conta
 * de serviço vivia no painel do Netlify.
 *
 * Fora das functions (emulador, scripts locais), aponte
 * GOOGLE_APPLICATION_CREDENTIALS para o arquivo JSON da conta de serviço.
 *
 * Regra da casa: SDK cliente só no navegador; Admin SDK só aqui.
 */

import { getApps, initializeApp, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function app() {
    if (getApps().length) return getApps()[0];

    // Dentro das functions, initializeApp() sem argumento já resolve as credenciais.
    // Em execução local, applicationDefault() lê GOOGLE_APPLICATION_CREDENTIALS.
    return initializeApp(
        process.env.FUNCTIONS_EMULATOR || process.env.K_SERVICE
            ? undefined
            : { credential: applicationDefault() }
    );
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
 * @param {object} claims - { role: 'admin' | 'advogado' | 'secretaria', escritorioId, escritorioNome }
 */
export async function definirClaims(uid, claims) {
    await adminAuth().setCustomUserClaims(uid, claims);
}
