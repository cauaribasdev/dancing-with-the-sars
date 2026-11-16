import type { WeatherAlert } from "../../api/types";

export function splitAlertsByCurrentStatus(alerts: WeatherAlert[], now: number) {
  const active: WeatherAlert[] = [];
  const history: WeatherAlert[] = [];
  for (const alert of alerts) {
    if (alert.status === "active" && Date.parse(alert.expires) > now) active.push(alert);
    else history.push(alert);
  }
  return { active, history };
}
