// Display names for regions. The API returns official IBGE names in Portuguese.
// State names are proper names and stay as they are; the country and the five macro-regions get English names.
// This is the only place that maps them.
import type { Region } from "./types";

export const REGION_NAMES_EN: Readonly<Record<string, string>> = {
  br: "Brazil",
  norte: "North",
  nordeste: "Northeast",
  "centro-oeste": "Central-West",
  sudeste: "Southeast",
  sul: "South",
};

/** Short display name: "Brazil", "South", "Rio Grande do Sul". */
export function regionName(region: Pick<Region, "id" | "name">): string {
  return REGION_NAMES_EN[region.id] ?? region.name;
}

/** Name for use inside a sentence: "Brazil", "the South region", "Rio Grande do Sul". */
export function regionNameInSentence(region: Pick<Region, "id" | "name" | "kind">): string {
  if (region.kind === "region") return `the ${regionName(region)} region`;
  return regionName(region);
}
