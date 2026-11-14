/**
 * Downloads official Brazilian boundaries from the IBGE public APIs and writes
 * server/data/regions.geojson: one FeatureCollection with the country, the 5
 * macro-regions and the 27 states (UFs).
 *
 * Usage: npm run boundaries -w server [-- minima|intermediaria|maxima]
 *
 * Sources (open, no auth):
 *   https://servicodados.ibge.gov.br/api/docs/malhas?versao=3
 *   https://servicodados.ibge.gov.br/api/docs/localidades
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import type { RegionProperties } from '../src/domain/region';

const quality = process.argv[2] ?? 'minima';
const MALHAS = 'https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR';
const LOCALIDADES = 'https://servicodados.ibge.gov.br/api/v1/localidades';

interface IbgeUf {
  id: number;
  sigla: string;
  nome: string;
  regiao: { id: number; sigla: string; nome: string };
}
interface IbgeRegiao {
  id: number;
  sigla: string;
  nome: string;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return (await res.json()) as T;
}

function malha(intrarregiao?: 'UF' | 'regiao'): string {
  const params = new URLSearchParams({ formato: 'application/vnd.geo+json', qualidade: quality });
  if (intrarregiao) params.set('intrarregiao', intrarregiao);
  return `${MALHAS}?${params}`;
}

const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');

type Geo = Polygon | MultiPolygon;

async function main() {
  console.log(`Fetching IBGE boundaries (qualidade=${quality})...`);
  const [country, byRegion, byUf, ufs, regioes] = await Promise.all([
    getJson<FeatureCollection<Geo>>(malha()),
    getJson<FeatureCollection<Geo>>(malha('regiao')),
    getJson<FeatureCollection<Geo>>(malha('UF')),
    getJson<IbgeUf[]>(`${LOCALIDADES}/estados`),
    getJson<IbgeRegiao[]>(`${LOCALIDADES}/regioes`),
  ]);

  const features: Feature<Geo, RegionProperties>[] = [];

  const brazil = country.features[0];
  if (!brazil) throw new Error('IBGE returned no country geometry');
  features.push({
    type: 'Feature',
    geometry: brazil.geometry,
    properties: { id: 'br', kind: 'country', code: 'BR', name: 'Brasil' },
  });

  for (const f of byRegion.features) {
    const code = Number(f.properties?.codarea);
    const r = regioes.find((x) => x.id === code);
    if (!r) throw new Error(`Unknown IBGE region code ${f.properties?.codarea}`);
    features.push({
      type: 'Feature',
      geometry: f.geometry,
      properties: { id: slug(r.nome), kind: 'region', code: r.sigla, name: r.nome, parentId: 'br' },
    });
  }

  for (const f of byUf.features) {
    const code = Number(f.properties?.codarea);
    const uf = ufs.find((x) => x.id === code);
    if (!uf) throw new Error(`Unknown IBGE UF code ${f.properties?.codarea}`);
    features.push({
      type: 'Feature',
      geometry: f.geometry,
      properties: {
        id: uf.sigla.toLowerCase(),
        kind: 'state',
        code: uf.sigla,
        name: uf.nome,
        ibgeCode: uf.id,
        parentId: slug(uf.regiao.nome),
      },
    });
  }

  const out: FeatureCollection<Geo, RegionProperties> = { type: 'FeatureCollection', features };
  const dir = fileURLToPath(new URL('../data/', import.meta.url));
  await mkdir(dir, { recursive: true });
  const file = `${dir}regions.geojson`;
  await writeFile(file, JSON.stringify(out));
  const counts = features.reduce<Record<string, number>>((acc, f) => {
    acc[f.properties.kind] = (acc[f.properties.kind] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`Wrote ${file}`, counts);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
