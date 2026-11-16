import type { Cache } from '../cache/cache';
import { cached } from '../cache/cache';
import type { DataSource } from '../../domain/pass';
import type { Organization } from '../../domain/organizations';
import { UpstreamError } from '../../application/ports';

const DEFAULT_URL = 'https://mapaosc.ipea.gov.br/download/20260806_MOSC_baseDivulgacao.csv';
const MAX_AGE_MS = 45 * 24 * 60 * 60 * 1000;
const AREA_COLUMNS: Record<string, string> = {
  '5': 'Area_Assistencia_social',
  '2': 'Area_Saude',
};
const AREA_LABELS: Record<string, string> = {
  '5': 'Assistência social',
  '2': 'Saúde',
};
const UF_IDS: Record<string, string> = {
  ac: '12', al: '27', ap: '16', am: '13', ba: '29', ce: '23', df: '53', es: '32', go: '52',
  ma: '21', mt: '51', ms: '50', mg: '31', pa: '15', pb: '25', pr: '41', pe: '26', pi: '22',
  rj: '33', rn: '24', rs: '43', ro: '11', rr: '14', sc: '42', sp: '35', se: '28', to: '17',
};

export type IpeaOrganization = Organization;

interface Snapshot {
  snapshotDate: string;
  source: DataSource;
  records: CompactOrganization[];
}

type CompactOrganization = [string, string, string, number, string, string, number, number];

export interface IpeaCatalog {
  findOrganizations(stateId: string, areaIds: string[]): Promise<{
    organizations: IpeaOrganization[];
    total: number;
    snapshotDate: string;
    source: DataSource;
  }>;
}

interface Options {
  cache: Cache;
  url?: string;
  timeoutMs?: number;
  now?: () => Date;
}

async function* csvRows(reader: ReadableStreamDefaultReader<Uint8Array>): AsyncGenerator<string[]> {
  const decoder = new TextDecoder('windows-1252');
  let pending = '';
  let quoted = false;
  let field = '';
  let row: string[] = [];
  while (true) {
    const { value, done } = await reader.read();
    pending += decoder.decode(value, { stream: !done });
    let i = 0;
    while (i < pending.length) {
      const ch = pending[i]!;
      if (ch === '"' && (quoted || field.trim() === '')) {
        if (quoted && i + 1 === pending.length && !done) break;
        if (quoted && pending[i + 1] === '"') { field += '"'; i += 2; continue; }
        quoted = !quoted;
        i++;
      } else if (ch === ';' && !quoted) {
        row.push(field.trim()); field = ''; i++;
      } else if (ch === '\n' && !quoted) {
        row.push(field.replace(/\r$/, '').trim());
        yield row;
        row = []; field = ''; i++;
      } else {
        field += ch; i++;
      }
    }
    pending = pending.slice(i);
    if (done) {
      if (quoted) throw new Error('IPEA CSV contains an unterminated quoted field');
      break;
    }
  }
  if (pending) field += pending;
  if (field || row.length) {
    row.push(field.replace(/\r$/, '').trim());
    yield row;
  }
}

function validDate(header: string, lastModified: string | null, now: Date): string {
  const parsed = lastModified ? new Date(lastModified) : new Date(Number.NaN);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  const named = header.match(/(20\d{6})/);
  return named ? `${named[1].slice(0, 4)}-${named[1].slice(4, 6)}-${named[1].slice(6, 8)}` : now.toISOString().slice(0, 10);
}

function parseNumber(value: string): number {
  return Number(value.trim().replace(',', '.'));
}

export function createIpeaCatalog({ cache, url = DEFAULT_URL, timeoutMs = 600_000, now = () => new Date() }: Options): IpeaCatalog {
  const key = `ipea:osc-snapshot:${url}`;

  async function load(): Promise<Snapshot> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { signal: controller.signal, headers: { accept: 'text/csv' } });
      if (!response.ok || !response.body) throw new Error(`IPEA CSV returned HTTP ${response.status}`);
      const snapshotDate = validDate(url, response.headers.get('last-modified'), now());
      const reader = response.body.getReader();
      const records: CompactOrganization[] = [];
      let headers: string[] | undefined;
      let indexes: Record<string, number> | undefined;
      let areaIndexes: [string, number][] = [];
      let rowsSeen = 0;

      const consume = (cells: string[]) => {
        if (!headers) {
          headers = cells.map((v, index) => index === 0 ? v.replace(/^\uFEFF/, '') : v);
          const required = ['cnpj', 'UF_Sigla', 'situacao_cadastral', 'tx_nome_fantasia_osc', 'cd_municipio', 'municipio_nome', 'longitude', 'latitude'];
          if (required.some((field) => !headers!.includes(field)) || !Object.values(AREA_COLUMNS).some((field) => headers!.includes(field))) {
            throw new Error('IPEA CSV has an unexpected schema');
          }
          indexes = Object.fromEntries(headers.map((name, index) => [name, index]));
          areaIndexes = Object.entries(AREA_COLUMNS)
            .map(([id, column]) => [id, indexes![column] ?? -1] as [string, number])
            .filter(([, index]) => index >= 0);
          return;
        }
        if (cells.length === 1 && !cells[0]) return;
        rowsSeen++;
        if (cells.length !== headers.length) return;
        const get = (field: string) => cells[indexes![field]!]?.trim() ?? '';
        const uf = get('UF_Sigla').toLowerCase();
        const cnpj = get('cnpj').replace(/\D/g, '');
        const name = (get('tx_nome_fantasia_osc') || get('tx_razao_social_osc')).trim();
        const municipalityCode = get('cd_municipio');
        const municipalityName = get('municipio_nome');
        const lon = parseNumber(get('longitude'));
        const lat = parseNumber(get('latitude'));
        const status = get('situacao_cadastral');
        if (!UF_IDS[uf ?? ''] || !/^\d{14}$/.test(cnpj ?? '') || !name ||
          !/^ativa$/i.test(status) ||
          !/^\d{7}$/.test(municipalityCode) || !municipalityName ||
          !Number.isFinite(lon) || lon < -180 || lon > 180 || !Number.isFinite(lat) || lat < -90 || lat > 90 ||
          /^(sim|1|true)$/i.test(get('removida_do_mosc'))) return;
        const areaMask = areaIndexes
          .filter(([, index]) => cells[index]?.trim() === '1')
          .reduce((mask, [id]) => mask | (1 << Number(id)), 0);
        if (!areaMask) return;
        records.push([cnpj, uf, name, areaMask, municipalityCode, municipalityName, lon, lat]);
      };

      for await (const cells of csvRows(reader)) consume(cells);
      if (!headers?.includes('cnpj') || !headers.includes('UF_Sigla') || !headers.includes('situacao_cadastral')) throw new Error('IPEA CSV has an unexpected schema');
      if (!rowsSeen || !records.length) throw new Error('IPEA CSV produced no valid organizations');
      const modified = response.headers.get('last-modified');
      const modifiedAt = modified ? Date.parse(modified) : Date.parse(`${snapshotDate}T00:00:00Z`);
      const source: DataSource = Number.isFinite(modifiedAt) && now().getTime() - modifiedAt > MAX_AGE_MS ? 'stale' : 'live';
      return { snapshotDate, records, source };
    } finally { clearTimeout(timer); }
  }

  return {
    async findOrganizations(stateId, areaIds) {
      if (!/^[a-z]{2}$/.test(stateId)) throw new Error('Expected a Brazilian state id');
      if (areaIds.length === 0 || areaIds.some((id) => !AREA_COLUMNS[id])) throw new Error('Unsupported IPEA area in current snapshot');
      let result;
      try {
        result = await cached(cache, key, 24 * 60 * 60 * 1000, load);
      } catch (error) {
        throw new UpstreamError((error as Error).message);
      }
      const requestedMask = areaIds.reduce((mask, id) => mask | (1 << Number(id)), 0);
      const organizations = result.value.records
        .filter((record) => record[1] === stateId && (record[3] & requestedMask) !== 0)
        .map((record) => ({
          id: record[0], uf: record[1], name: record[2],
          areas: Object.keys(AREA_LABELS).filter((id) => (record[3] & (1 << Number(id))) !== 0).map((id) => AREA_LABELS[id]),
          municipality: { code: record[4], name: record[5] }, lon: record[6], lat: record[7],
        }));
      return {
        organizations,
        total: organizations.length,
        snapshotDate: result.value.snapshotDate,
        source: result.source === 'stale' || result.value.source === 'stale' ? 'stale' : result.source,
      };
    },
  };
}
