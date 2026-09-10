import { NextResponse } from "next/server";
import { revisarPeca, conferirChecklist } from "@/services/aiService";
import { exigirAuth } from "@/lib/auth-middleware";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limiter";
import { revisaoRequestSchema } from "@/lib/validation";

export const maxDuration = 300;

/**
 * Revisão adversarial: o checklist formal roda em código (determinístico) e a
 * auditoria de conteúdo roda no modelo. Os dois resultados voltam juntos.
 */
export async function POST(request) {
    try {
        const auth = await exigirAuth(request);
        if (auth.resposta) return auth.resposta;
        const { uid, escritorioNome } = auth.identidade;

        const limite = checkRateLimit(request, { ...RATE_LIMITS.revisarPeca, keyGenerator: () => uid });
        if (limite) return limite;

        const body = await request.json();
        const validacao = revisaoRequestSchema.safeParse(body);
        if (!validacao.success) {
            return NextResponse.json({ error: "Dados inválidos", details: validacao.error.format() }, { status: 400 });
        }

        const { texto, tipoPeca, area, caso, fontes } = validacao.data;

        const checklist = tipoPeca ? conferirChecklist(texto, tipoPeca) : null;
        const revisao = await revisarPeca(escritorioNome, texto, { area, tipoPeca, caso, fontes });

        return NextResponse.json({ success: true, checklist, revisao });
    } catch (erro) {
        console.error("[api/review-petition]", erro);
        return NextResponse.json({ error: erro.message || "Erro ao revisar a peça" }, { status: 500 });
    }
}
