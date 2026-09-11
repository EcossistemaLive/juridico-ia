import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const saPath = path.join(__dirname, "..", "service-account.json");
const serviceAccount = JSON.parse(fs.readFileSync(saPath, "utf8"));

const app = getApps().length ? getApps()[0] : initializeApp({
    credential: cert(serviceAccount)
});

const auth = getAuth(app);
const db = getFirestore(app);

async function run() {
    const uids = ["tZWvfrZgyWZXhvOCBYIfLWQfvKp2", "JgCdfZFCc9UXB8SIjgOCfCQmMyj1"];
    const escritorioId = "escritorio_principal";
    const escritorioNome = "Escritório do Dr. De Moraes";

    for (const uid of uids) {
        try {
            const user = await auth.getUser(uid);
            await auth.setCustomUserClaims(uid, { role: "admin", escritorioId, escritorioNome });
            await db.collection("users").doc(uid).set({
                email: user.email,
                escritorioId,
                escritorioNome,
                role: "admin",
                status: "active",
                paymentApproved: true,
                plano: "piloto"
            }, { merge: true });
            console.log(`[OK] Claims e perfil definidos para: ${user.email} (${uid})`);
        } catch (err) {
            console.error(`[ERRO] Usuário ${uid}:`, err.message);
        }
    }

    await db.collection("escritorios").doc(escritorioId).set({
        nome: escritorioNome,
        plano: "piloto",
        limites: { casos: 100, analises: 500, peticoes: 200 },
        criadoEm: new Date()
    }, { merge: true });

    console.log(`[OK] Escritório ${escritorioId} registrado com sucesso!`);
    process.exit(0);
}

run().catch(err => {
    console.error("Falha fatal:", err);
    process.exit(1);
});
