import { describe, expect, it } from "vitest";
import type { WeatherAlert } from "../../api/types";
import { splitAlertsByCurrentStatus } from "./alertState";

const alert = (id: string, expires: string, status: WeatherAlert["status"] = "active"): WeatherAlert => ({
  id,
  sent: "2026-11-15T10:00:00Z",
  event: "Chuva",
  severity: "moderate",
  color: "#fffe00",
  onset: "2026-11-15T10:00:00Z",
  expires,
  headline: id,
  description: "",
  instruction: "",
  url: "https://avisos.inmet.gov.br/test",
  municipalities: [],
  municipalityCountTotal: 0,
  geometry: null,
  status,
});

describe("splitAlertsByCurrentStatus", () => {
  it("moves an alert to history at its CAP expiration without waiting for a fetch", () => {
    const expiresAt = Date.parse("2026-11-15T12:00:00Z");
    const item = alert("due", "2026-11-15T12:00:00Z");
    expect(splitAlertsByCurrentStatus([item], expiresAt - 1).active).toEqual([item]);
    expect(splitAlertsByCurrentStatus([item], expiresAt).history).toEqual([item]);
  });

  it("does not reactivate a server-expired alert when its expiry is malformed or future", () => {
    const now = Date.parse("2026-11-15T12:00:00Z");
    const expired = alert("expired", "2026-11-15T13:00:00Z", "expired");
    const malformed = alert("bad", "not-a-date");
    expect(splitAlertsByCurrentStatus([expired, malformed], now).active).toEqual([]);
    expect(splitAlertsByCurrentStatus([expired, malformed], now).history).toEqual([expired, malformed]);
  });
});
