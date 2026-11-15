import { expect, it } from 'vitest';
import { paths } from './paths';
it('separates home from explorer and preserves encoded filters', () => {
  expect(paths.home()).toBe('/');
  expect(paths.overview()).toBe('/explore');
  expect(paths.overview({region:'sc',month:'2026-07'})).toBe('/explore?month=2026-07&region=sc');
});
it('preserves story, radar and comparison deep links', () => {
  expect(paths.story('rs-flood-jul-2026')).toBe('/story/rs-flood-jul-2026');
  expect(paths.region('rs', {start:'2026-07-01',end:'2026-08-05'})).toBe('/region/rs?start=2026-07-01&end=2026-08-05');
  expect(paths.compare('a/b','c')).toBe('/compare?before=a%2Fb&after=c');
});
