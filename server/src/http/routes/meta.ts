import { Hono } from 'hono';
import { config, PRODUCTS } from '../../config';

export function metaRoutes() {
  const r = new Hono();

  r.get('/health', (c) => c.json({ ok: true, time: new Date().toISOString() }));

  r.get('/meta', (c) =>
    c.json({
      products: PRODUCTS,
      dataStart: config.dataStart,
      maxRangeDays: config.maxRangeDays,
      notes: [
        'Browse PNGs (browse.latlon) are open access; full HDF5 products (download) need a free NASA Earthdata Login.',
        'Browse PNGs are Web Mercator and do not span the footprint bbox: use GET /api/passes/:id/browse for their corners.',
        'Only compare passes with the same stackId (same track, direction and frame).',
        'INMET alert text is delivered as published; sent, onset and expires are normalized to UTC ISO timestamps.',
        'IPEA organization snapshots require the public CSV download; area 5 (social assistance) and area 2 (health) are supported in the current export. Missing housing/community classifications are never inferred.',
      ],
      attribution: [
        { name: 'NASA-ISRO NISAR via NASA CMR / ASF DAAC', url: 'https://cmr.earthdata.nasa.gov/search' },
        { name: 'Territorial boundaries: IBGE', url: 'https://servicodados.ibge.gov.br/api/docs/malhas?versao=3' },
        { name: 'Weather alerts: INMET via WIS2', url: 'https://wis2bra.inmet.gov.br/oapi/openapi' },
        { name: 'Civil society organizations: IPEA Mapa das OSCs', url: 'https://mapaosc.ipea.gov.br/base-dados' },
      ],
    }),
  );

  return r;
}
