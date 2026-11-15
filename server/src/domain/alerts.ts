import type { MultiPolygon, Polygon } from 'geojson';

export type AlertSeverity = 'minor' | 'moderate' | 'severe' | 'extreme';
export type AlertStatus = 'active' | 'expired';

/** Normalized INMET alert from CAP. Status is computed at request time from expires. */
export interface WeatherAlert {
  id: string;
  sent: string;
  event: string;
  severity: AlertSeverity;
  color: string;
  onset: string;
  expires: string;
  headline: string;
  description: string;
  instruction: string;
  url: string;
  municipalities: { code: string; name: string }[];
  municipalityCountTotal: number;
  geometry: Polygon | MultiPolygon | null;
}
