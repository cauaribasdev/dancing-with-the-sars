// Textos simples, em português, para os campos das passagens.
import type { Direction, Maturity } from "../../api/types";

export function directionLabel(d: Direction): string {
  return d === "ascending" ? "Ascendente" : "Descendente";
}

export function directionExplained(d: Direction): string {
  return d === "ascending" ? "Ascendente, de sul para norte" : "Descendente, de norte para sul";
}

export const MATURITY_TEXT: Record<Maturity, { label: string; note: string }> = {
  beta: { label: "Beta", note: "Versão inicial. Os valores ainda podem mudar." },
  provisional: { label: "Provisório", note: "Verificado, mas a calibração ainda está sendo refinada." },
  validated: { label: "Validado", note: "Qualidade final, conferida com medições em campo." },
};

const POLARIZATION_TEXT: Record<string, string> = {
  HH: "transmitida e recebida horizontalmente",
  HV: "transmitida horizontalmente e recebida verticalmente",
  VV: "transmitida e recebida verticalmente",
  VH: "transmitida verticalmente e recebida horizontalmente",
};

/** Explica os canais de polarização em linguagem simples. */
export function polarizationsExplained(pols: string[]): string {
  return pols.map((p) => (POLARIZATION_TEXT[p] ? `${p} (${POLARIZATION_TEXT[p]})` : p)).join(", ");
}

/** Image strip name as shown to people. The stackId is track + direction + frame. */
export function stripLabel(stackId: string): string {
  return `faixa ${stackId.replace(/_/g, "-")}`;
}
