import type { Maturity, Pass } from './pass';

const MATURITY_RANK: Record<Maturity, number> = { validated: 3, provisional: 2, beta: 1 };

function score(p: Pass): number[] {
  return [
    MATURITY_RANK[p.maturity],
    p.fullFrame ? 1 : 0,
    p.polarizations.length,
    p.rangeBandwidthMHz ?? 0,
  ];
}

function better(a: Pass, b: Pass): Pass {
  const sa = score(a), sb = score(b);
  for (let i = 0; i < sa.length; i++) {
    if ((sa[i] ?? 0) !== (sb[i] ?? 0)) return (sa[i] ?? 0) > (sb[i] ?? 0) ? a : b;
  }
  return a.id >= b.id ? a : b;
}

/**
 * One acquisition can appear several times (beta/provisional/validated reprocessing,
 * or different radar modes). Keep the best record per stack + cycle.
 */
export function dedupeAcquisitions(passes: Pass[]): Pass[] {
  const best = new Map<string, Pass>();
  for (const p of passes) {
    const key = `${p.stackId}|${p.cycle ?? p.date}`;
    const cur = best.get(key);
    best.set(key, cur ? better(cur, p) : p);
  }
  return [...best.values()].sort((a, b) => a.start.localeCompare(b.start) || a.stackId.localeCompare(b.stackId));
}
