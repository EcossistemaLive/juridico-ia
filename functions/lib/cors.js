/**
 * CORS — o front é estático no GitHub Pages, em outra origem.
 *
 * Sem servidor no mesmo domínio, toda chamada é cross-origin. A lista de origens
 * permitidas é explícita: em produto que guarda material sob sigilo, `*` no
 * Access-Control-Allow-Origin não é aceitável, mesmo com token exigido.
 */

const PADRAO = [
    "http://localhost:3000",
    "http://127.0.0.1:3000"
];

function origensPermitidas() {
    const doAmbiente = (process.env.ORIGENS_PERMITIDAS || "")
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean);
    return [...PADRAO, ...doAmbiente];
}

/**
 * Aplica os cabeçalhos de CORS e responde ao preflight.
 * @returns {boolean} true quando a requisição já foi respondida (preflight ou origem barrada)
 */
export function aplicarCors(req, res) {
    const origem = req.headers.origin;
    const permitidas = origensPermitidas();

    if (origem && permitidas.includes(origem)) {
        res.set("Access-Control-Allow-Origin", origem);
        res.set("Vary", "Origin");
    } else if (origem) {
        res.status(403).json({ error: "Origem não autorizada" });
        return true;
    }

    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
    res.set("Access-Control-Max-Age", "3600");

    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return true;
    }

    if (req.method !== "POST") {
        res.status(405).json({ error: "Método não permitido" });
        return true;
    }

    return false;
}
