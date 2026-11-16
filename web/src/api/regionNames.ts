// Nomes de exibição das regiões. A API retorna nomes oficiais do IBGE em português.
// Estados mantêm seus nomes próprios; país e macrorregiões são mapeados aqui.
import type { Region } from "./types";

export const REGION_NAMES_PT: Readonly<Record<string, string>> = {
  br: "Brasil",
  norte: "Norte",
  nordeste: "Nordeste",
  "centro-oeste": "Centro-Oeste",
  sudeste: "Sudeste",
  sul: "Sul",
};

/** Nome curto de exibição. */
export function regionName(region: Pick<Region, "id" | "name">): string {
  return REGION_NAMES_PT[region.id] ?? region.name;
}

/** Nome para uso em frases. */
export function regionNameInSentence(region: Pick<Region, "id" | "name" | "kind">): string {
  if (region.kind === "region") return `região ${regionName(region)}`;
  return regionName(region);
}
