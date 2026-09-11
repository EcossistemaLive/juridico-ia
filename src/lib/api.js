"use client";

/**
 * Cliente HTTP das Cloud Functions.
 *
 * O front é estático no GitHub Pages e o backend vive em outra origem. Este é o
 * único lugar do cliente que sabe disso. Toda chamada leva o ID token do Firebase
 * no cabeçalho — é o que a function verifica com o Admin SDK.
 *
 * A chave da Anthropic NUNCA existe aqui. Se algum dia você se pegar querendo
 * colocá-la no front para "simplificar", pare: ela seria extraível por qualquer
 * usuário logado e a conta fica aberta.
 */

import { auth } from "./firebase";

const BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");

if (typeof window !== "undefined" && !BASE) {
    console.warn("[api] NEXT_PUBLIC_API_BASE_URL não configurada — as chamadas vão falhar.");
}

async function token() {
    const usuario = auth?.currentUser;
    if (!usuario) throw new Error("Sessão não encontrada. Entre novamente.");
    // force=false: o SDK renova sozinho quando falta menos de 5 minutos.
    return usuario.getIdToken();
}

async function tratarErro(resposta) {
    let mensagem = `Erro ${resposta.status}`;
    try {
        const corpo = await resposta.json();
        mensagem = corpo.error || mensagem;
        if (corpo.details) console.warn("[api] detalhes da validação:", corpo.details);
    } catch {
        /* resposta sem JSON */
    }

    if (resposta.status === 401) mensagem = "Sessão expirada. Entre novamente.";
    if (resposta.status === 402) mensagem = "Seu acesso ainda está pendente de aprovação.";
    if (resposta.status === 429) mensagem = "Muitas requisições seguidas. Aguarde um instante.";

    throw new Error(mensagem);
}

async function post(funcao, corpo) {
    const resposta = await fetch(`${BASE}/${funcao}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${await token()}`
        },
        body: JSON.stringify(corpo)
    });

    if (!resposta.ok) await tratarErro(resposta);
    return resposta.json();
}

/** Lê um File do input e devolve base64 puro, sem o prefixo data:. */
export function arquivoParaBase64(file) {
    return new Promise((resolve, reject) => {
        const leitor = new FileReader();
        leitor.onload = () => resolve(String(leitor.result).split(",")[1]);
        leitor.onerror = () => reject(new Error("Falha ao ler o arquivo"));
        leitor.readAsDataURL(file);
    });
}

/** DOCX, TXT e MD viram texto no servidor. PDF não passa por aqui. */
export async function extrairTexto(file) {
    const base64 = await arquivoParaBase64(file);
    return post("parseFile", { nomeArquivo: file.name, base64 });
}

/**
 * Monta o `conteudo` da análise a partir de um arquivo.
 * PDF segue nativo (base64) para a API do Claude, que lê texto e imagem e
 * devolve citação por página. Os demais formatos viram texto antes.
 */
export async function prepararConteudo(file) {
    const ehPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

    if (ehPdf) {
        return {
            conteudo: { base64: await arquivoParaBase64(file), mimeType: "application/pdf", title: file.name },
            texto: null
        };
    }

    const { texto } = await extrairTexto(file);
    return { conteudo: texto, texto };
}

export const analisarDocumento = (corpo) => post("analisar", corpo);
export const planejarPeca = (corpo) => post("planejar", corpo);
export const revisarPeca = (corpo) => post("revisar", corpo);

/**
 * Redação em streaming. `aoReceber` é chamado a cada pedaço de texto.
 * @returns {Promise<string>} o texto completo da peça
 */
export async function redigirPeca(corpo, aoReceber) {
    const resposta = await fetch(`${BASE}/redigir`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${await token()}`
        },
        body: JSON.stringify(corpo)
    });

    if (!resposta.ok) await tratarErro(resposta);

    const leitor = resposta.body.getReader();
    const decodificador = new TextDecoder();
    let completo = "";

    while (true) {
        const { done, value } = await leitor.read();
        if (done) break;
        const pedaco = decodificador.decode(value, { stream: true });
        completo += pedaco;
        aoReceber?.(pedaco, completo);
    }

    // A function marca falha no meio do stream assim, porque o cabeçalho 200 já foi.
    if (completo.includes("[ERRO NA GERAÇÃO:")) {
        throw new Error(completo.split("[ERRO NA GERAÇÃO:")[1].replace("]", "").trim());
    }

    return completo;
}
