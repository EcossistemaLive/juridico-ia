/**
 * Fachada do cérebro jurídico.
 *
 * As functions importam daqui e nunca do motor diretamente. Trocar de fornecedor
 * de modelo, ou reorganizar as skills, não deve tocar em nenhuma function.
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
} from "./claude-client/index.js";

export { analisarDocumento, revisarPeca } from "./doc-analyst/index.js";
export { planejarPeca, redigirPeca, conferirChecklist } from "./petition-drafter/index.js";
export { TIPOS_PECA, LISTA_TIPOS, getTipoPeca, tiposPorGrupo } from "./petition-drafter/piece-types.js";
export { AREA_LABELS, AREAS_SUPORTADAS, getBaseJuridica, temBaseCompleta, AVISO_RESPONSABILIDADE } from "./base-juridica/index.js";
export { montarOverlays, PACOTE_FORO_MODELO, PACOTE_ESTILO_MODELO, FORO_TJGO_GOIANIA } from "./overlays/index.js";
