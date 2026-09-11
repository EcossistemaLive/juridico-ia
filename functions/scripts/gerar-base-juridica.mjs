/**
 * Gera `functions/skills/base-juridica/conteudo.js` a partir do material de referência.
 *
 * Por que gerar em vez de ler o .md em runtime: o código roda em Cloud Functions,
 * onde só sobe o que está dentro de functions/ — e `referencias/` fica fora, na
 * raiz do repositório. O conteúdo vira um módulo JS, entra no deploy e é servido
 * como `cacheableContext` para o Claude (prompt caching), o que derruba o custo
 * a partir da segunda chamada da mesma área.
 *
 * Uso:  npm run build:base
 *
 * Fonte: referencias/advogado-especialista/SKILL.md
 * Ver atribuição e situação de licença em CREDITOS-E-LICENCAS.md.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Resolvido a partir do próprio arquivo, não do cwd: o script roda tanto de
// functions/ (npm run build:base) quanto da raiz (workflow do GitHub Actions).
const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ_FUNCTIONS = path.resolve(AQUI, "..");
const RAIZ_REPO = path.resolve(RAIZ_FUNCTIONS, "..");
const FONTE = path.join(RAIZ_REPO, "referencias", "advogado-especialista", "SKILL.md");
const DESTINO = path.join(RAIZ_FUNCTIONS, "skills", "base-juridica", "conteudo.js");
const RAIZ = RAIZ_REPO;

/** Módulo do material de origem -> área do direito no nosso domínio. */
const MODULO_PARA_AREA = {
    1: "familia",
    2: "penal",
    3: "penal",
    4: "familia",
    5: "familia",
    6: "civil",
    7: "consumidor",
    8: "imobiliario",
    9: "trabalhista",
    10: "previdenciario",
    11: "tributario",
    12: "administrativo",
    13: "digital",
    14: "empresarial"
};

/**
 * Seções que valem para todas as áreas (processo, súmulas, restrições).
 * Casadas pelo início do título, em minúsculas e sem acento.
 */
const TITULOS_COMUNS = [
    "workflow completo de analise de caso",
    "etapa ",
    "cpc (processo civil)",
    "juizados especiais",
    "trabalhista (clt)",
    "stj",
    "stf",
    "restricoes absolutas",
    "legislacao principal"
];

const semAcento = (s) =>
    s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

function fatiar(markdown) {
    // Normaliza CRLF antes de qualquer coisa: em JavaScript o "." das expressões
    // regulares não casa com \r, então /^##\s+(.*)$/ falharia em todo cabeçalho
    // de um arquivo salvo no Windows — e o fatiamento sairia mudo, sem erro.
    const linhas = markdown.replace(/\r\n?/g, "\n").split("\n");
    const areas = {};
    const comuns = [];

    let moduloAtual = null;
    let emComum = false;

    for (const linha of linhas) {
        const h2 = linha.match(/^##\s+(.*)$/);
        const h3 = linha.match(/^###\s+(\d{1,2})\.\d+\s/);

        if (h3) {
            moduloAtual = parseInt(h3[1], 10);
            emComum = false;
        } else if (h2) {
            const titulo = semAcento(h2[1]);
            const moduloDeclarado = titulo.match(/^modulo\s+(\d{1,2})/);
            if (moduloDeclarado) {
                moduloAtual = parseInt(moduloDeclarado[1], 10);
                emComum = false;
            } else if (TITULOS_COMUNS.some((t) => titulo.startsWith(t))) {
                emComum = true;
                moduloAtual = null;
            }
        }

        if (emComum) {
            comuns.push(linha);
            continue;
        }

        const area = MODULO_PARA_AREA[moduloAtual];
        if (area) {
            (areas[area] ||= []).push(linha);
        }
    }

    const limpar = (arr) => arr.join("\n").replace(/\n{3,}/g, "\n\n").trim();

    const resultado = { comum: limpar(comuns) };
    for (const [area, linhasArea] of Object.entries(areas)) {
        resultado[area] = limpar(linhasArea);
    }
    return resultado;
}

function main() {
    if (!fs.existsSync(FONTE)) {
        console.error(`[base-juridica] fonte não encontrada: ${FONTE}`);
        process.exit(1);
    }

    const markdown = fs.readFileSync(FONTE, "utf-8");
    const blocos = fatiar(markdown);

    const cabecalho = `/**
 * ARQUIVO GERADO — não edite à mão.
 * Regenere com: npm run build:base
 *
 * Base doutrinária por área do direito, usada como contexto cacheável nas
 * chamadas ao Claude. Fonte e atribuição em CREDITOS-E-LICENCAS.md.
 * Gerado em ${new Date().toISOString().slice(0, 10)}.
 */

`;

    const corpo =
        "export const CONTEUDO = {\n" +
        Object.entries(blocos)
            .map(([chave, texto]) => `    ${chave}: ${JSON.stringify(texto)}`)
            .join(",\n") +
        "\n};\n";

    fs.mkdirSync(path.dirname(DESTINO), { recursive: true });
    fs.writeFileSync(DESTINO, cabecalho + corpo, "utf-8");

    console.log(`[base-juridica] gerado ${path.relative(RAIZ, DESTINO)}`);
    for (const [chave, texto] of Object.entries(blocos)) {
        console.log(`  ${chave.padEnd(16)} ${String(texto.length).padStart(6)} chars  ~${Math.round(texto.length / 3.6)} tokens`);
    }
}

main();
