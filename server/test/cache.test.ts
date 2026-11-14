import { createHash } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cached, createDiskCache } from '../src/infra/cache/cache';

const HOUR = 3_600_000;
const KEY = 'cmr:v1:GCOV:test:2026-07-20';

let dir: string;

/** Write an entry exactly as a previous server process would have left it in .cache/. */
async function seedDisk(storedAt: number, value: unknown) {
  const file = path.join(dir, `${createHash('sha1').update(KEY).digest('hex')}.json`);
  await writeFile(file, JSON.stringify({ key: KEY, storedAt, value }));
}

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'nisar-cache-test-'));
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-07-25T12:00:00Z'));
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(async () => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  await rm(dir, { recursive: true, force: true });
});

describe('createDiskCache after a restart', () => {
  it('keeps serving an expired entry as "stale" while the loader keeps failing', async () => {
    await seedDisk(Date.now() - 2 * HOUR, ['old']);
    const cache = createDiskCache(dir); // new instance = restarted server
    const load = vi.fn(async (): Promise<string[]> => {
      throw new Error('CMR down');
    });

    const first = await cached(cache, KEY, HOUR, load);
    const second = await cached(cache, KEY, HOUR, load);

    expect(first).toEqual({ value: ['old'], source: 'stale' });
    expect(second).toEqual({ value: ['old'], source: 'stale' });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('expires a fresh entry on its original schedule, not one renewed by the restart', async () => {
    const storedAt = Date.now() - 50 * 60_000; // 50 min old, TTL 1 h
    await seedDisk(storedAt, ['disk']);
    const cache = createDiskCache(dir);
    const load = vi.fn(async () => ['new']);

    expect(await cached(cache, KEY, HOUR, load)).toEqual({ value: ['disk'], source: 'cache' });
    expect((await cache.get(KEY))?.storedAt).toBe(storedAt);

    vi.setSystemTime(Date.now() + 20 * 60_000); // now 70 min old
    expect(await cached(cache, KEY, HOUR, load)).toEqual({ value: ['new'], source: 'live' });
    expect(load).toHaveBeenCalledTimes(1);
  });
});
