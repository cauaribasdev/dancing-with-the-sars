import { describe, expect, it } from 'vitest';
import { generatePosts } from '../src/domain/posts';
import { makePass } from './helpers';

const stories = [
  { id: 'rs-flood-jul-2026', title: 'Cheia no RS', subtitle: 'História do RS', regionId: 'rs', eventDate: '2026-07-22' },
  { id: 'other-state', title: 'Outra história', subtitle: 'História de SC', regionId: 'sc', eventDate: '2026-07-22' },
];

describe('generatePosts', () => {
  it('creates pass posts and only same-stack before/after pairs', () => {
    const before = makePass({ id: 'pass-before', date: '2026-07-11', stackId: '053_D_103' });
    const after = makePass({ id: 'pass-after', date: '2026-07-23', stackId: '053_D_103' });
    const otherGeometry = makePass({ id: 'pass-other', date: '2026-07-23', stackId: '054_D_103' });
    const posts = generatePosts('rs', [before, after, otherGeometry], []);

    expect(posts.filter((post) => post.kind === 'pass')).toHaveLength(2);
    const pairs = posts.filter((post) => post.kind === 'pair');
    expect(pairs).toHaveLength(1);
    expect(pairs[0]).toMatchObject({
      date: '2026-07-23',
      link: { page: 'compare', before: 'pass-before', after: 'pass-after' },
    });
  });

  it('includes stories for the requested state and sorts newest first deterministically', () => {
    const pass = makePass({ id: 'pass-1', date: '2026-07-23' });
    const posts = generatePosts('rs', [pass], stories);

    expect(posts.map((post) => post.date)).toEqual(['2026-07-23', '2026-07-22']);
    expect(posts.at(-1)).toMatchObject({
      kind: 'story',
      link: { page: 'story', storyId: 'rs-flood-jul-2026' },
    });
  });

  it('uses stable identifiers and returns an empty list without inputs', () => {
    const pass = makePass({ id: 'stable-id', date: '2026-07-23' });
    const first = generatePosts('rs', [pass], []);
    const second = generatePosts('rs', [pass], []);
    expect(first).toEqual(second);
    expect(generatePosts('rs', [], [])).toEqual([]);
  });
});
