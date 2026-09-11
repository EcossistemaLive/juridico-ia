export function extrairNumerosCnj(texto) {
  // Padrão CNJ: 0000000-00.0000.0.00.0000
  const cnjRegex = /\b\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}\b/g;
  const matches = texto.match(cnjRegex) || [];
  return [...new Set(matches)]; // Retorna únicos
}

export function detectarPeca(texto) {
  const textLower = texto.toLowerCase();
  if (textLower.includes("petição inicial") || textLower.includes("ação de")) return "inicial";
  if (textLower.includes("contestação") || textLower.includes("apresentar defesa")) return "contestacao";
  if (textLower.includes("recurso de apelação") || textLower.includes("apelante")) return "apelacao";
  if (textLower.includes("agravo de instrumento") || textLower.includes("agravante")) return "agravo";
  return "outro";
}
