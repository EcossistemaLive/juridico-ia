import { NextResponse } from "next/server";
import { analisarDocumento } from "@/services/aiService";
import { exigirAuth, pertenceAoEscritorio } from "@/lib/auth-middleware";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limiter";
import { analiseRequestSchema } from "@/lib/validation";
import { adminDb } from "@/lib/firebase-admin";

export const maxDuration = 300;

export async function POST(request) {
    try {
        const auth = await exigirAuth(request);
        if (auth.resposta) return auth.resposta;
        const { uid, escritorioId, escritorioNome } = auth.identidade;

        const limite = checkRateLimit(request, { ...RATE_LIMITS.analisarDocumento, keyGenerator: () => uid });
        if (limite) return limite;

        const body = await request.json();
        const validacao = analiseRequestSchema.safeParse(body);
        if (!validacao.success) {
            return NextResponse.json(
                { error: "Dados inválidos", details: validacao.error.format() },
                { status: 400 }
            );
        }

        const { conteudo, area, casoId, caso: casoPayload, objetivo, analisePrevia } = validacao.data;

        // O caso vem do banco pelo Admin SDK, com checagem de escritório.
        let caso = casoPayload || null;
        if (casoId) {
            const doc = await adminDb().collection("cases").doc(casoId).get();
            if (!doc.exists) {
                return NextResponse.json({ error: "Caso não encontrado" }, { status: 404 });
            }
            const dados = doc.data();
            if (!pertenceAoEscritorio(dados, escritorioId)) {
                return NextResponse.json({ error: "Caso não pertence a este escritório" }, { status: 403 });
            }
            caso = { id: doc.id, ...dados };
        }

        const analise = await analisarDocumento(escritorioNome, conteudo, {
            area: caso?.area || area,
            caso,
            objetivo,
            analisePrevia
        });

        return NextResponse.json({ success: true, analise });
    } catch (erro) {
        console.error("[api/analyze-document]", erro);
        return NextResponse.json(
            {
                error: erro.message || "Erro ao processar a análise",
                details: process.env.NODE_ENV === "development" ? erro.stack : undefined
            },
            { status: 500 }
        );
    }
}
