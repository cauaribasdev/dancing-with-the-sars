// Plain-language wording for pass fields (interface text in English, for non-specialists).
import type { Direction, Maturity } from "../../api/types";

export function directionLabel(d: Direction): string {
  return d === "ascending" ? "Ascending" : "Descending";
}

export function directionExplained(d: Direction): string {
  return d === "ascending" ? "Ascending, moving south to north" : "Descending, moving north to south";
}

export const MATURITY_TEXT: Record<Maturity, { label: string; note: string }> = {
  beta: { label: "Beta", note: "Early release. Values may still change." },
  provisional: { label: "Provisional", note: "Checked, but calibration is still being refined." },
  validated: { label: "Validated", note: "Final quality, checked against ground measurements." },
};

const POLARIZATION_TEXT: Record<string, string> = {
  HH: "sent and received horizontally",
  HV: "sent horizontally, received vertically",
  VV: "sent and received vertically",
  VH: "sent vertically, received horizontally",
};

/** ["HH","HV"] → "HH (sent and received horizontally), HV (sent horizontally, received vertically)" */
export function polarizationsExplained(pols: string[]): string {
  return pols.map((p) => (POLARIZATION_TEXT[p] ? `${p} (${POLARIZATION_TEXT[p]})` : p)).join(", ");
}

/** Image strip name as shown to people. The stackId is track + direction + frame. */
export function stripLabel(stackId: string): string {
  return `strip ${stackId.replace(/_/g, "-")}`;
}
