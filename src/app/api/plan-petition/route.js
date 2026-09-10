import { NextResponse } from "next/server";
import { planejarPeca } from "@/services/aiService";
import { exigirAuth } from "@/lib/auth-middleware";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limiter";
import { planoRequestSchema } from "@/lib/validation";
import { carregarContextoDoCaso } from "@/lib/caso-loader";

export const maxDuration = 300;

export async function POST(request) {
    try {
        const auth = await exigirAuth(request);
        if (auth.resposta) return auth.resposta;
        const { uid, escritorioId, escritorioNome } = auth.identidade;

        const limite = checkRateLimit(request, { ...RATE_LIMITS.planejarPeca, keyGenerator: () => uid });
        if (limite) return limite;

        const body = await request.json();
        const validacao = planoRequestSchema.safeParse(body);
        if (!validacao.success) {
            return NextResponse.json({ error: "Dados inválidos", details: validacao.error.format() }, { status: 400 });
        }

        const contexto = await carregarContextoDoCaso(validacao.data, escritorioId);
        if (contexto.erro) return NextResponse.json({ error: contexto.erro }, { status: contexto.status });

        const plano = await planejarPeca(escritorioNome, contexto.dados);

        return NextResponse.json({ success: true, plano });
    } catch (erro) {
        console.error("[api/plan-petition]", erro);
        return NextResponse.json({ error: erro.message || "Erro ao planejar a peça" }, { status: 500 });
    }
}
