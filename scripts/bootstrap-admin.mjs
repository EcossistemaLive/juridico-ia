/**
 * Grava as custom claims do primeiro administrador de um escritório.
 *
 * Papel e escritório vivem nas claims do Firebase Auth, não em e-mail escrito no
 * código — foi a correção deliberada em relação ao RecrutaAI, onde dois e-mails
 * apareciam hardcoded em cinco lugares e mudar um privilégio exigia deploy.
 *
 * Uso (com GOOGLE_APPLICATION_CREDENTIALS apontando para o JSON da conta de serviço):
 *   node scripts/bootstrap-admin.mjs <uid> <escritorioId> "<Nome do Escritório>"
 *
 * Depois de rodar, o usuário precisa renovar o token no navegador
 * (getIdToken(true)) — senão continua com as claims antigas e leva 403.
 */

import { adminAuth, adminDb, definirClaims } from "../functions/lib/firebase-admin.js";

const [uid, escritorioId, escritorioNome] = process.argv.slice(2);

if (!uid || !escritorioId || !escritorioNome) {
    console.error('uso: node scripts/bootstrap-admin.mjs <uid> <escritorioId> "<Nome do Escritório>"');
    process.exit(1);
}

const usuario = await adminAuth().getUser(uid).catch(() => null);
if (!usuario) {
    console.error(`Usuário ${uid} não existe no Firebase Auth. Cadastre-se pelo app primeiro.`);
    process.exit(1);
}

await definirClaims(uid, { role: "admin", escritorioId, escritorioNome });

// O perfil no Firestore espelha as claims para a UI, mas quem manda são as claims.
await adminDb().collection("users").doc(uid).set(
    {
        email: usuario.email,
        escritorioId,
        escritorioNome,
        role: "admin",
        status: "active",
        paymentApproved: true,
        plano: "piloto"
    },
    { merge: true }
);

// O documento do escritório é lido pelo caso-loader para montar os overlays.
await adminDb().collection("escritorios").doc(escritorioId).set(
    {
        nome: escritorioNome,
        plano: "piloto",
        limites: { casos: 50, analises: 200, peticoes: 100 },
        foroPadrao: null,
        estilo: null,
        criadoEm: new Date()
    },
    { merge: true }
);

console.log(`claims gravadas para ${usuario.email} — escritório ${escritorioNome} (${escritorioId})`);
console.log("Peça ao usuário para sair e entrar de novo, ou chame getIdToken(true) no app.");
process.exit(0);
