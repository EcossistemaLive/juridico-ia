/**
 * Presets de rate limit por rota.
 *
 * Ficam separados do `rate-limiter.js` (herdado do RecrutaAI) porque o motor vai
 * mudar: o Map em memória não sobrevive a função serverless, onde cada invocação
 * pode cair numa instância nova. Com Claude Opus na ponta, isso é exposição
 * financeira direta.
 *
 * PENDÊNCIA ANTES DO GO-LIVE: trocar o Map por contador no Firestore ou Upstash,
 * mantendo esta mesma interface. Limitar por uid, nunca por IP.
 */
export const RATE_LIMITS = {
    parseFile: { limit: 20, windowMs: 60000 },
    analisarDocumento: { limit: 5, windowMs: 60000 },
    planejarPeca: { limit: 5, windowMs: 60000 },
    redigirPeca: { limit: 3, windowMs: 60000 },
    revisarPeca: { limit: 5, windowMs: 60000 }
};
