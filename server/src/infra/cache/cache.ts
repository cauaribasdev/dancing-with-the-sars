import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { DataSource } from '../../domain/pass';

interface Entry<T> {
  storedAt: number;
  value: T;
}

export interface Cache {
  get<T>(key: string): Promise<Entry<T> | undefined>;
  set<T>(key: string, value: T): Promise<void>;
}

/** In-memory cache (used in tests). */
export function createMemoryCache(): Cache {
  const map = new Map<string, Entry<unknown>>();
  return {
    async get<T>(key: string) {
      return map.get(key) as Entry<T> | undefined;
    },
    async set<T>(key: string, value: T) {
      map.set(key, { storedAt: Date.now(), value });
    },
  };
}

/**
 * Disk-backed cache with an in-memory layer. Survives restarts, so a demo keeps
 * working even if the NASA CMR API is slow or down during judging.
 */
export function createDiskCache(dir: string): Cache {
  // Keeps each entry with its original storedAt (also when read back from disk after a restart),
  // so TTLs and the "stale" label stay correct.
  const memory = new Map<string, Entry<unknown>>();
  const fileFor = (key: string) =>
    path.join(dir, `${createHash('sha1').update(key).digest('hex')}.json`);
  let dirReady: Promise<unknown> | undefined;

  return {
    async get<T>(key: string) {
      const hit = memory.get(key) as Entry<T> | undefined;
      if (hit) return hit;
      try {
        const disk = JSON.parse(await readFile(fileFor(key), 'utf8')) as Entry<T> & { key: string };
        if (disk.key !== key) return undefined;
        const entry: Entry<T> = { storedAt: disk.storedAt, value: disk.value };
        memory.set(key, entry);
        return entry;
      } catch {
        return undefined;
      }
    },
    async set<T>(key: string, value: T) {
      const storedAt = Date.now();
      memory.set(key, { storedAt, value });
      dirReady ??= mkdir(dir, { recursive: true });
      await dirReady;
      await writeFile(fileFor(key), JSON.stringify({ key, storedAt, value }));
    },
  };
}

/**
 * Read-through cache with stale-if-error: fresh entry -> "cache"; otherwise load
 * -> "live"; if loading fails and any old entry exists -> "stale" (never fabricate).
 */
export async function cached<T>(
  cache: Cache,
  key: string,
  ttlMs: number,
  load: () => Promise<T>,
): Promise<{ value: T; source: DataSource }> {
  const entry = await cache.get<T>(key);
  if (entry && Date.now() - entry.storedAt < ttlMs) return { value: entry.value, source: 'cache' };
  try {
    const value = await load();
    await cache.set(key, value);
    return { value, source: 'live' };
  } catch (err) {
    if (entry) {
      console.warn(`[cache] serving stale entry for ${key}: ${(err as Error).message}`);
      return { value: entry.value, source: 'stale' };
    }
    throw err;
  }
}

/** Combine sources of several cached parts into one response-level source. */
export function mergeSources(sources: DataSource[]): DataSource {
  if (sources.includes('stale')) return 'stale';
  if (sources.includes('live')) return 'live';
  return 'cache';
}
