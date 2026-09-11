/**
 * Gera `src/lib/catalogo.js` a partir do cérebro em functions/.
 *
 * O front precisa das listas (áreas do direito, tipos de peça) para montar os
 * selects, mas não pode importar de functions/ — são dois pacotes com deploys
 * separados, e o bundle do navegador não pode arrastar prompts nem schemas.
 *
 * Em vez de duplicar as listas à mão e vê-las divergirem, geramos: uma fonte de
 * verdade, um arquivo derivado. Roda no `npm run build`.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, "..");
const DESTINO = path.join(RAIZ, "src", "lib", "catalogo.js");

const { AREA_LABELS } = await import(
    pathToFileURL(path.join(RAIZ, "functions", "skills", "base-juridica", "index.js")).href
).catch(async () => {
    // base-juridica importa conteudo.js, que é gerado. Se ainda não existe,
    // lemos as labels direto do arquivo — é declaração estática.
    const fonte = fs.readFileSync(
        path.join(RAIZ, "functions", "skills", "base-juridica", "index.js"),
        "utf-8"
    );
    const bloco = fonte.match(/export const AREA_LABELS = \{([\s\S]*?)\};/);
    const labels = {};
    for (const linha of bloco[1].split("\n")) {
        const m = linha.match(/(\w+):\s*"([^"]+)"/);
        if (m) labels[m[1]] = m[2];
    }
    return { AREA_LABELS: labels };
});

const fonteTipos = fs.readFileSync(
    path.join(RAIZ, "functions", "skills", "petition-drafter", "piece-types.js"),
    "utf-8"
);

const tipos = [];
const regex = /"?([a-z-]+)"?:\s*\{\s*\n\s*nome:\s*"([^"]+)",\s*\n\s*grupo:\s*"([^"]+)",\s*\n\s*rito:\s*"([^"]+)"/g;
let m;
while ((m = regex.exec(fonteTipos)) !== null) {
    tipos.push({ id: m[1], nome: m[2], grupo: m[3], rito: m[4] });
}

if (!tipos.length) {
    console.error("[catalogo] nenhum tipo de peça encontrado — o formato de piece-types.js mudou?");
    process.exit(1);
}

const conteudo = `/**
 * ARQUIVO GERADO — não edite à mão.
 * Regenere com: npm run build:catalogo
 *
 * Listas derivadas do cérebro em functions/skills/, para os selects da interface.
 * Gerado em ${new Date().toISOString().slice(0, 10)}.
 */

export const AREA_LABELS = ${JSON.stringify(AREA_LABELS, null, 4)};

export const AREAS = Object.keys(AREA_LABELS);

export const TIPOS_PECA = ${JSON.stringify(tipos, null, 4)};

export function tiposPorGrupo() {
    return TIPOS_PECA.reduce((acc, tipo) => {
        (acc[tipo.grupo] ||= []).push(tipo);
        return acc;
    }, {});
}

export const POLOS = [
    { id: "ativo", nome: "Polo ativo" },
    { id: "passivo", nome: "Polo passivo" },
    { id: "terceiro", nome: "Terceiro interessado" },
    { id: "consultivo", nome: "Consultivo (sem lide)" }
];
`;

fs.mkdirSync(path.dirname(DESTINO), { recursive: true });
fs.writeFileSync(DESTINO, conteudo, "utf-8");
console.log(`[catalogo] gerado src/lib/catalogo.js — ${Object.keys(AREA_LABELS).length} áreas, ${tipos.length} tipos de peça`);
