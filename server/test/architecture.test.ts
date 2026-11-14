/**
 * Enforces the layer rule described in README.md ("Arquitetura"): reads every file under
 * src/, resolves its relative imports to a layer and fails on any import the rule forbids.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SRC = fileURLToPath(new URL('../src/', import.meta.url));

type Layer = 'shared' | 'domain' | 'application' | 'infra' | 'http' | 'config' | 'composition-root' | 'index';

const LAYER_DIRS = ['shared', 'domain', 'application', 'infra', 'http'] as const;
const ROOT_FILES: Record<string, Layer> = {
  'config.ts': 'config',
  'composition-root.ts': 'composition-root',
  'index.ts': 'index',
};

/** Which layers each layer may import (relative imports). */
const ALL: Layer[] = ['shared', 'domain', 'application', 'infra', 'http', 'config', 'composition-root', 'index'];
const ALLOWED: Record<Layer, Layer[]> = {
  shared: ['shared'],
  domain: ['domain', 'shared'],
  application: ['application', 'domain', 'shared'],
  infra: ['infra', 'application', 'domain', 'shared', 'config'],
  http: ['http', 'application', 'domain', 'shared', 'config'],
  config: ['config', 'domain', 'shared'],
  'composition-root': ALL,
  index: ALL,
};

/** Packages that belong to the HTTP layer only (index.ts starts the server, so it may use them too). */
const isHttpPackage = (spec: string) => /^(hono|zod|@hono\/)/.test(spec);
/** Layers that must stay pure: no Node built-ins (fs, net, ...) and no global fetch. */
const PURE: Layer[] = ['shared', 'domain', 'application'];
const NODE_BUILTINS = new Set([
  'fs', 'path', 'http', 'https', 'net', 'os', 'child_process', 'crypto', 'url', 'stream', 'dns', 'tls', 'zlib', 'worker_threads',
]);

function layerOf(absFile: string): Layer | null {
  const rel = path.relative(SRC, absFile);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return null;
  const parts = rel.split(path.sep);
  if (parts.length === 1) return ROOT_FILES[parts[0]!] ?? null;
  return (LAYER_DIRS as readonly string[]).includes(parts[0]!) ? (parts[0] as Layer) : null;
}

/** Resolve an extensionless relative import to its file (./x -> ./x.ts or ./x/index.ts). */
function resolveImport(fromFile: string, spec: string): string {
  const base = path.resolve(path.dirname(fromFile), spec);
  for (const candidate of [base, `${base}.ts`, path.join(base, 'index.ts')]) {
    if (candidate.endsWith('.ts') && existsSync(candidate)) return candidate;
  }
  return base;
}

function importsOf(source: string): string[] {
  const specs: string[] = [];
  const re = /\bfrom\s*['"]([^'"]+)['"]|\bimport\s*\(?\s*['"]([^'"]+)['"]/g;
  for (const m of source.matchAll(re)) specs.push((m[1] ?? m[2])!);
  return specs;
}

const files = readdirSync(SRC, { recursive: true, encoding: 'utf8' })
  .filter((f) => f.endsWith('.ts'))
  .map((f) => path.join(SRC, f));

/** Every rule violation in src/, one readable line each (an empty list means the rule holds). */
function violations(): string[] {
  const out: string[] = [];
  for (const file of files) {
    const rel = path.relative(SRC, file).split(path.sep).join('/');
    const from = layerOf(file);
    if (!from) {
      out.push(`${rel}: file is not in a known layer (${LAYER_DIRS.join(', ')}) or a known root file`);
      continue;
    }
    const source = readFileSync(file, 'utf8');
    for (const spec of importsOf(source)) {
      if (spec.startsWith('.')) {
        const target = layerOf(resolveImport(file, spec));
        if (!target) out.push(`${rel}: imports "${spec}", which is outside the known layers`);
        else if (!ALLOWED[from].includes(target)) out.push(`${rel}: ${from} must not import ${target} ("${spec}")`);
      } else {
        if (isHttpPackage(spec) && from !== 'http' && from !== 'index') out.push(`${rel}: "${spec}" may only be used under http/`);
        if (PURE.includes(from) && (spec.startsWith('node:') || NODE_BUILTINS.has(spec.split('/')[0]!))) {
          out.push(`${rel}: ${from} must not do I/O, but imports "${spec}"`);
        }
      }
    }
    if (PURE.includes(from) && /\bfetch\s*\(/.test(source)) out.push(`${rel}: ${from} must not call fetch()`);
  }
  return out;
}

describe('architecture', () => {
  it('finds the source files and their imports', () => {
    expect(files.length).toBeGreaterThan(20);
    const relative = files.flatMap((f) => importsOf(readFileSync(f, 'utf8'))).filter((s) => s.startsWith('.'));
    expect(relative.length).toBeGreaterThan(40);
  });

  it('follows the dependency rule (see README, "Arquitetura")', () => {
    expect(violations()).toEqual([]);
  });
});
