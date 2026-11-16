import { describe, it, expect } from 'vitest';
import { normalizeRegionQuery } from './navigation';
const now = new Date('2026-11-14T12:00:00Z');
const parse = (q: string) => normalizeRegionQuery(new URLSearchParams(q), now);
describe('regional URL contract A03–A05', () => {
 it('defaults to overview and 30 UTC days', () => { const r=parse(''); expect(r.params.get('tab')).toBe('overview'); expect(r.params.get('start')).toBe('2026-10-16'); expect(r.params.get('end')).toBe('2026-11-14'); expect(r.warning).toBe(false); });
 it('migrates legacy selections', () => { expect(parse('pass=id').params.get('tab')).toBe('radar'); expect(parse('day=2026-11-01').params.get('day')).toBe('2026-11-01'); });
 it.each(['start=bad','start=2026-11-01','start=2026-11-12&end=2026-11-01','start=2026-11-01&end=2026-11-15','start=2024-01-01&end=2026-11-01'])('rejects period %s', q => { const r=parse(q+'&pass=id'); expect(r.warning).toBe(true); expect(r.params.get('pass')).toBeNull(); expect(r.params.get('start')).toBe('2026-10-16'); });
 it('rejects invalid tab and day', () => { const r=parse('tab=invalid&day=2020-01-01&pass=x'); expect(r.warning).toBe(true); expect(r.params.get('tab')).toBe('overview'); expect(r.params.has('day')).toBe(false); expect(r.params.has('pass')).toBe(false); });
 it('is idempotent and preserves selection across tabs', () => { const r=parse('tab=help&day=2026-11-01&pass=x'); expect(parse(r.params.toString()).params.toString()).toBe(r.params.toString()); expect(r.params.get('pass')).toBe('x'); });
});
