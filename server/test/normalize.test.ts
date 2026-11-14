import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { dedupeAcquisitions } from '../src/domain/acquisitions';
import { normalizeGcov, type UmmItem } from '../src/infra/cmr/normalize';
import { makePass } from './helpers';

const item = JSON.parse(readFileSync(new URL('./fixtures/gcov-umm-item.json', import.meta.url), 'utf8')) as UmmItem;

describe('normalizeGcov (real CMR record, 2026-07-23 over Porto Alegre)', () => {
  const pass = normalizeGcov(item, 'provisional')!;

  it('reads geometry/identity fields from AdditionalAttributes and the granule name', () => {
    expect(pass.id).toBe('NISAR_L2_PR_GCOV_026_053_D_103_4005_DHDH_A_20260723T213350_20260723T213425_P05023_N_F_J_001');
    expect(pass).toMatchObject({
      product: 'GCOV',
      maturity: 'provisional',
      date: '2026-07-23',
      cycle: 26,
      track: 53,
      frame: 103,
      direction: 'descending',
      stackId: '053_D_103',
      fullFrame: true,
      polarizations: ['HH', 'HV'],
      rangeBandwidthMHz: 40,
      sizeBytes: 7004487680,
    });
  });

  it('builds a closed GeoJSON footprint and its bbox', () => {
    expect(pass.footprint.type).toBe('Polygon');
    const ring = (pass.footprint as GeoJSON.Polygon).coordinates[0]!;
    expect(ring[0]).toEqual(ring.at(-1));
    expect(pass.bbox).toEqual([-53.48535, -30.29778, -50.42869, -27.75004]);
  });

  it('keeps only https links (no s3://) for browse, download and QA', () => {
    expect(pass.browse.latlon).toMatch(/^https:\/\/nisar\.asf\.earthdatacloud\.nasa\.gov\/BROWSE\/.*_LATLON\.png$/);
    expect(pass.browse.thumbnail).toMatch(/_LATLON_thumbnail\.png$/);
    expect(pass.download).toMatch(/^https:\/\/.*\.h5$/);
    expect(pass.qaReport).toMatch(/_QA_REPORT\.pdf$/);
  });

  it('returns null instead of guessing when the footprint is missing', () => {
    const broken = structuredClone(item);
    delete broken.umm.SpatialExtent;
    expect(normalizeGcov(broken, 'provisional')).toBeNull();
  });
});

describe('dedupeAcquisitions', () => {
  it('keeps one record per stack+cycle, preferring validated, then full frame, then dual-pol', () => {
    const beta = makePass({ maturity: 'beta' });
    const validated = makePass({ maturity: 'validated' });
    const partial = makePass({ maturity: 'validated', fullFrame: false });
    const singlePol = makePass({ maturity: 'validated', polarizations: ['HH'] });
    const otherStack = makePass({ stackId: '053_D_104', frame: 104 });
    const out = dedupeAcquisitions([beta, partial, singlePol, validated, otherStack]);
    expect(out).toHaveLength(2);
    expect(out.find((p) => p.stackId === '053_D_103')?.id).toBe(validated.id);
  });

  it('treats different cycles of the same stack as different acquisitions', () => {
    const a = makePass({ cycle: 25, date: '2026-07-11' });
    const b = makePass({ cycle: 26, date: '2026-07-23' });
    expect(dedupeAcquisitions([b, a]).map((p) => p.date)).toEqual(['2026-07-11', '2026-07-23']);
  });
});
