import { NextResponse } from "next/server";
import { redigirPeca } from "@/services/aiService";
import { exigirAuth } from "@/lib/auth-middleware";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limiter";
import { redacaoRequestSchema } from "@/lib/validation";
import { carregarContextoDoCaso } from "@/lib/caso-loader";

export const maxDuration = 300;

/**
 * Redação da peça em streaming — o advogado vê a peça nascendo.
 * O checklist formal roda depois, no cliente, via /api/check-petition.
 */
export async function POST(request) {
    try {
        const auth = await exigirAuth(request);
        if (auth.resposta) return auth.resposta;
        const { uid, escritorioId, escritorioNome } = auth.identidade;

        const limite = checkRateLimit(request, { ...RATE_LIMITS.redigirPeca, keyGenerator: () => uid });
        if (limite) return limite;

        const body = await request.json();
        const validacao = redacaoRequestSchema.safeParse(body);
        if (!validacao.success) {
            return NextResponse.json({ error: "Dados inválidos", details: validacao.error.format() }, { status: 400 });
        }

        const contexto = await carregarContextoDoCaso(validacao.data, escritorioId);
        if (contexto.erro) return NextResponse.json({ error: contexto.erro }, { status: contexto.status });

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    for await (const pedaco of redigirPeca(escritorioNome, contexto.dados, validacao.data.plano)) {
                        controller.enqueue(encoder.encode(pedaco));
                    }
                    controller.close();
                } catch (erro) {
                    controller.error(erro);
                }
            }
        });

        return new Response(stream, {
            headers: {
                "Content-Type": "text/plain; charset=utf-8",
                "Transfer-Encoding": "chunked",
                "Cache-Control": "no-store"
            }
        });
    } catch (erro) {
        console.error("[api/draft-petition]", erro);
        return NextResponse.json({ error: erro.message || "Erro ao redigir a peça" }, { status: 500 });
    }
}
