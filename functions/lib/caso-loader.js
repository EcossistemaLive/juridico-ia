/**
 * Carrega, pelo servidor, tudo que as skills de redação precisam do caso:
 * o caso em si, a última análise, os modelos do escritório e os overlays.
 *
 * Centralizado aqui porque três rotas precisam exatamente do mesmo contexto e
 * porque toda leitura passa pela checagem de escritório — o ponto em que o
 * isolamento entre clientes é realmente garantido.
 */

import { adminDb } from "./firebase-admin.js";
import { pertenceAoEscritorio } from "./auth-middleware.js";

const LIMITE_MODELOS_CHARS = 120000;

export async function carregarContextoDoCaso(payload, escritorioId) {
    const db = adminDb();
    const dados = { ...payload };

    // Se o cliente já enviou o objeto do caso completo, usa diretamente
    if (payload.caso) {
        dados.caso = payload.caso;
        dados.area = dados.area || payload.caso.area;
    }

    if (payload.casoId && !dados.caso) {
        try {
            const doc = await db.collection("cases").doc(payload.casoId).get();
            if (!doc.exists) return { erro: "Caso não encontrado", status: 404 };

            const caso = doc.data();
            if (!pertenceAoEscritorio(caso, escritorioId)) {
                return { erro: "Caso não pertence a este escritório", status: 403 };
            }
            dados.caso = { id: doc.id, ...caso };
            dados.area = dados.area || caso.area;
        } catch (err) {
            console.warn("[caso-loader] Aviso ao consultar Firestore para casoId:", err.message);
            if (payload.caso) {
                dados.caso = payload.caso;
                dados.area = dados.area || payload.caso.area;
            }
        }
    }

    // Última análise do caso, se o cliente não mandou uma.
    if (payload.casoId && !dados.analise) {
        try {
            const analises = await db
                .collection("analyses")
                .where("escritorioId", "==", escritorioId)
                .where("casoId", "==", payload.casoId)
                .orderBy("criadoEm", "desc")
                .limit(1)
                .get();
            if (!analises.empty) dados.analise = analises.docs[0].data().resultado;
        } catch (err) {
            console.warn("[caso-loader] Aviso ao buscar analises:", err.message);
        }
    }

    // Configuração do escritório: overlays de foro e estilo.
    try {
        const config = await db.collection("escritorios").doc(escritorioId).get();
        if (config.exists) {
            const c = config.data();
            dados.foro = dados.foro || c.foroPadrao || null;
            dados.estilo = dados.estilo || c.estilo || null;
        }
    } catch (err) {
        console.warn("[caso-loader] Aviso ao buscar config escritorio:", err.message);
    }

    // Modelos e teses do escritório para a área — entram como contexto cacheável.
    if (!dados.modelosEscritorio) {
        try {
            const modelos = await db
                .collection("templates")
                .where("escritorioId", "==", escritorioId)
                .where("area", "==", dados.area || "civil")
                .limit(5)
                .get();

            if (!modelos.empty) {
                let acumulado = "";
                for (const m of modelos.docs) {
                    const t = m.data();
                    const bloco = `\n\n### MODELO: ${t.titulo || m.id} (${t.tipoPeca || "peça"})\n${t.conteudo || ""}`;
                    if (acumulado.length + bloco.length > LIMITE_MODELOS_CHARS) break;
                    acumulado += bloco;
                }
                dados.modelosEscritorio = acumulado.trim() || undefined;
            }
        } catch (err) {
            console.warn("[caso-loader] Aviso ao buscar modelos:", err.message);
        }
    }

    return { dados };
}
