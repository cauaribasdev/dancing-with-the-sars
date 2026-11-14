/**
 * Pre-fills the disk cache so the demo is fast and survives a CMR outage:
 * every story (including browse georeferencing), Brazil coverage per month,
 * and monthly passes for the South region.
 *
 * Usage: npm run warm -w server [-- <fromMonth YYYY-MM>]
 */
import { config } from '../src/config';
import { createDeps } from '../src/composition-root';
import { addDays, isoDate, parseDate } from '../src/shared/dates';
import { brazilCoverage, findRegionPasses } from '../src/application/passes';
import { STORIES } from '../src/application/stories/definitions';
import { resolveStory } from '../src/application/stories/resolve';

const from = process.argv[2] ?? config.dataStart.slice(0, 7);

function months(fromMonth: string): { start: string; end: string }[] {
  const out: { start: string; end: string }[] = [];
  const today = isoDate(new Date());
  for (let d = parseDate(`${fromMonth}-01`); isoDate(d) <= today; ) {
    const next = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
    const end = isoDate(addDays(next, -1));
    out.push({ start: isoDate(d), end: end > today ? today : end });
    d = next;
  }
  return out;
}

async function timed<T>(label: string, fn: () => Promise<T>): Promise<T | undefined> {
  const t = Date.now();
  try {
    const v = await fn();
    console.log(`ok   ${label} (${((Date.now() - t) / 1000).toFixed(1)}s)`);
    return v;
  } catch (err) {
    console.log(`FAIL ${label}: ${(err as Error).message}`);
    return undefined;
  }
}

async function main() {
  const deps = createDeps();
  for (const s of STORIES) await timed(`story ${s.id}`, () => resolveStory(deps, s.id));
  for (const m of months(from)) {
    const w = { ...m, product: 'GCOV' as const };
    await timed(`coverage BR ${m.start}..${m.end}`, () => brazilCoverage(deps, w));
    await timed(`passes sul ${m.start}..${m.end}`, () => findRegionPasses(deps, 'sul', w));
  }
}

main();
