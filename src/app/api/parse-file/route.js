import { NextResponse } from "next/server";
import { exigirAuth } from "@/lib/auth-middleware";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limiter";
import { detectarPeca, extrairNumerosCnj } from "@/utils/pieceDetection";

/**
 * Roteador de documento — NÃO é mais um extrator de texto.
 *
 * No RecrutaAI esta rota extraía texto e truncava em 15 mil caracteres (~7
 * páginas), o que serve para currículo e inviabiliza autos. Aqui o PDF segue
 * inteiro para o Claude, que o lê nativamente com citação por página. A extração
 * local continua, mas só para o barato: classificar o tipo de peça, achar o
 * número CNJ e mostrar uma prévia ao usuário.
 */

const MAX_BYTES = 32 * 1024 * 1024; // limite da API para documento em uma requisição
const PREVIA_CHARS = 4000;

export async function POST(req) {
    try {
        const auth = await exigirAuth(req);
        if (auth.resposta) return auth.resposta;

        const limite = checkRateLimit(req, { ...RATE_LIMITS.parseFile, keyGenerator: () => auth.identidade.uid });
        if (limite) return limite;

        const formData = await req.formData();
        const file = formData.get("file");
        if (!file) return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });

        if (file.size > MAX_BYTES) {
            return NextResponse.json(
                {
                    error: `Arquivo de ${(file.size / 1024 / 1024).toFixed(1)}MB excede o limite de 32MB por requisição. Divida os autos por seção (ex.: peças, provas, decisões) e envie em partes.`
                },
                { status: 413 }
            );
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const nome = (file.name || "").toLowerCase();
        const mime = file.type || "";

        const ehPDF = mime === "application/pdf" || nome.endsWith(".pdf");
        const ehDOCX = mime.includes("wordprocessingml") || nome.endsWith(".docx");
        const ehTXT = mime === "text/plain" || nome.endsWith(".txt") || nome.endsWith(".md");

        // PDF: segue nativo para o modelo. Extraímos texto apenas para triagem local.
        if (ehPDF) {
            let textoTriagem = "";
            try {
                const pdf = (await import("pdf-parse")).default;
                const data = await pdf(buffer, { max: 12 }); // só as primeiras páginas
                textoTriagem = data.text || "";
            } catch (erro) {
                console.warn("[parse-file] triagem local do PDF falhou (segue mesmo assim):", erro.message);
            }

            return NextResponse.json({
                modo: "documento",
                mimeType: "application/pdf",
                base64: buffer.toString("base64"),
                nomeArquivo: file.name,
                bytes: file.size,
                previa: textoTriagem.slice(0, PREVIA_CHARS),
                deteccao: detectarPeca(textoTriagem),
                numerosCnj: extrairNumerosCnj(textoTriagem),
                aviso: textoTriagem.trim()
                    ? null
                    : "Não foi possível ler texto localmente (PDF digitalizado). O documento segue para a IA, que faz a leitura por imagem e texto."
            });
        }

        // DOCX e TXT viram texto — a API não recebe .docx como documento nativo.
        let texto = "";
        if (ehDOCX) {
            try {
                const mammoth = await import("mammoth");
                const resultado = await mammoth.extractRawText({ buffer });
                texto = resultado.value;
            } catch (erro) {
                console.error("[parse-file] DOCX:", erro.message);
                return NextResponse.json({ error: "Erro ao ler o arquivo DOCX. Ele pode estar corrompido." }, { status: 422 });
            }
        } else if (ehTXT) {
            texto = buffer.toString("utf-8");
        } else {
            return NextResponse.json(
                { error: "Formato não suportado. Envie PDF, DOCX, TXT ou MD." },
                { status: 415 }
            );
        }

        if (!texto?.trim()) {
            return NextResponse.json({ error: "Não foi possível extrair texto do arquivo." }, { status: 422 });
        }

        return NextResponse.json({
            modo: "texto",
            texto,
            nomeArquivo: file.name,
            caracteres: texto.length,
            previa: texto.slice(0, PREVIA_CHARS),
            deteccao: detectarPeca(texto),
            numerosCnj: extrairNumerosCnj(texto)
        });
    } catch (erro) {
        console.error("[parse-file] erro inesperado:", erro);
        return NextResponse.json({ error: "Erro interno ao processar o arquivo: " + erro.message }, { status: 500 });
    }
}
