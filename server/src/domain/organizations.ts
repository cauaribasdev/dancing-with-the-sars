export interface Organization {
  id: string;
  uf: string;
  name: string;
  areas: string[];
  municipality: { code: string; name: string };
  lon: number;
  lat: number;
  url?: string | null;
}
