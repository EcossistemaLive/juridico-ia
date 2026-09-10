/**
 * AI Service — fachada do cérebro jurídico.
 *
 * Mesmo papel do arquivo homônimo no RecrutaAI: as rotas de API importam daqui e
 * nunca do motor diretamente. Trocar de fornecedor de modelo, ou reorganizar as
 * skills, não deve tocar em nenhuma rota.
 */

export {
    callClaude,
    streamClaude,
    callClaudeStructured,
    callClaudeWithDocument,
    uploadToFilesApi,
    documentBlock,
    parseJsonResponse,
    removeEmojis,
    MODELS
} from "../skills/claude-client/index.js";

export { analisarDocumento, revisarPeca } from "../skills/doc-analyst/index.js";
export { planejarPeca, redigirPeca, conferirChecklist } from "../skills/petition-drafter/index.js";
export { TIPOS_PECA, LISTA_TIPOS, getTipoPeca, tiposPorGrupo } from "../skills/petition-drafter/piece-types.js";
export { AREA_LABELS, AREAS_SUPORTADAS, getBaseJuridica, temBaseCompleta, AVISO_RESPONSABILIDADE } from "../skills/base-juridica/index.js";
export { montarOverlays, PACOTE_FORO_MODELO, PACOTE_ESTILO_MODELO, FORO_TJGO_GOIANIA } from "../skills/overlays/index.js";
