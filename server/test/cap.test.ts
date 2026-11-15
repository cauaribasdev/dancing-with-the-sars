import { describe, expect, it } from 'vitest';
import { parseCapAlert } from '../src/infra/inmet/parse-cap';

const cap = (severity = 'Moderate', polygon = '-30.0,-51.0 -29.0,-50.0 -28.0,-49.0 -30.0,-51.0') => `<?xml version="1.0"?>
<alert xmlns="urn:oasis:names:tc:emergency:cap:1.2">
  <identifier>urn:oid:cap-1</identifier><sent>2026-11-15T12:00:00-03:00</sent>
  <info><language>pt-BR</language><event>Tempestade</event><severity>${severity}</severity>
    <onset>2026-11-15T09:00:00-03:00</onset><expires>2026-11-16T00:00:00-03:00</expires>
    <headline>Aviso de tempestade</headline><description>Descrição integral</description>
    <instruction>Instrução integral</instruction><web>https://avisos.inmet.gov.br/56412</web>
    <parameter><valueName>ColorRisk</valueName><value>#FFFE00</value></parameter>
    <parameter><valueName>Municipios</valueName><value>Porto Alegre - RS (4314902), Canoas - RS (4304606)</value></parameter>
    <area><areaDesc>Brasil</areaDesc><polygon>${polygon}</polygon></area>
  </info>
</alert>`;

describe('parseCapAlert', () => {
  it('parses CAP fields, municipality codes, and reverses CAP lat/lon to GeoJSON lon/lat', () => {
    const alert = parseCapAlert(cap());
    expect(alert).toMatchObject({
      id: 'urn:oid:cap-1', event: 'Tempestade', severity: 'moderate', color: '#FFFE00',
      sent: '2026-11-15T15:00:00.000Z', onset: '2026-11-15T12:00:00.000Z', expires: '2026-11-16T03:00:00.000Z', headline: 'Aviso de tempestade',
      description: 'Descrição integral', instruction: 'Instrução integral',
      municipalityCountTotal: 2,
      municipalities: [{ code: '4314902', name: 'Porto Alegre' }, { code: '4304606', name: 'Canoas' }],
      url: 'https://avisos.inmet.gov.br/56412',
      geometry: { type: 'Polygon', coordinates: [[[-51, -30], [-50, -29], [-49, -28], [-51, -30]]] },
    });
  });

  it('combines multiple CAP area polygons into MultiPolygon', () => {
    const xml = cap('Severe', '-30,-51 -29,-50 -28,-49 -30,-51')
      .replace('</area>', '</area><area><polygon>-20,-40 -19,-39 -18,-38 -20,-40</polygon></area>');
    expect(parseCapAlert(xml)?.geometry).toEqual({
      type: 'MultiPolygon',
      coordinates: [
        [[[-51, -30], [-50, -29], [-49, -28], [-51, -30]]],
        [[[-40, -20], [-39, -19], [-38, -18], [-40, -20]]],
      ],
    });
  });

  it('ignores unsupported severities and malformed XML', () => {
    expect(parseCapAlert(cap('Unknown'))).toBeNull();
    expect(parseCapAlert('<alert>')).toBeNull();
  });
});
