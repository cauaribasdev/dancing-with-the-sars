/**
 * Validates browse-image georeferencing on real NISAR scenes.
 *
 * Background: the naive assumption "the _LATLON.png spans the CMR footprint bbox" is wrong
 * (transparent margins of varying size; Web Mercator pixels). src/domain/georef.ts fits the
 * real bounds instead. This script runs that fit on every pass in a region/date window and
 * reports, per image, the misfit and the fitted pixel aspect (independent sx/sy fits that
 * agree at ~1.0 confirm the Web Mercator model), next to the error the naive bbox would cause.
 *
 * Usage: npm run check:browse -w server [-- <regionId> <start> <end>]
 */
import { PNG } from 'pngjs';
import { createDeps } from '../src/composition-root';
import { georeferenceBrowse } from '../src/domain/georef';
import { findRegionPasses } from '../src/application/passes';

const [regionId = 'rs', start = '2026-07-11', end = '2026-07-27', limit = '16'] = process.argv.slice(2);

async function main() {
  const deps = createDeps();
  const { passes } = await findRegionPasses(deps, regionId, { start, end, product: 'GCOV' });
  const sample = passes.filter((p) => p.browse.latlon).slice(0, Number(limit));
  console.log(`Checking ${sample.length} of ${passes.length} passes over ${regionId}, ${start}..${end}\n`);
  console.log('date        stack      size        rms(px)  aspect  clipped        quality  naive-bbox shift');

  let bad = 0;
  for (const pass of sample) {
    const res = await fetch(pass.browse.latlon!);
    if (!res.ok) {
      console.log(`${pass.date}  ${pass.stackId}  download failed: HTTP ${res.status}`);
      bad++;
      continue;
    }
    const png = PNG.sync.read(Buffer.from(await res.arrayBuffer()));
    const g = georeferenceBrowse(png, pass.footprint);
    if (!g) {
      console.log(`${pass.date}  ${pass.stackId}  no valid pixels`);
      bad++;
      continue;
    }
    // How far off the naive "image == footprint bbox" overlay would be, as % of the image span.
    const [w, s, e, n] = pass.bbox;
    const [gw, gs, ge, gn] = g.bounds;
    const naive = Math.max(Math.abs(w - gw) / (ge - gw), Math.abs(e - ge) / (ge - gw), Math.abs(n - gn) / (gn - gs), Math.abs(s - gs) / (gn - gs));
    if (g.quality !== 'good') bad++;
    console.log(
      `${pass.date}  ${pass.stackId}  ${`${g.width}x${g.height}`.padEnd(10)}  ${g.rmsErrorPx.toFixed(2).padStart(7)}  ${(g.pixelAspect?.toFixed(3) ?? '  -  ').padEnd(6)}  ${(g.clippedCorners.join(',') || '-').padEnd(13)}  ${g.quality.padEnd(7)}  ${(100 * naive).toFixed(1)}%`,
    );
  }
  console.log(bad === 0 ? '\nRESULT: all images georeferenced with good quality.' : `\nRESULT: ${bad} image(s) need attention.`);
  process.exit(bad === 0 ? 0 : 2);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
