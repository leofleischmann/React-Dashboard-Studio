import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Drift guard: the SDK module surface is declared once in src/sdk/modules.ts.
// Several other places mirror that list (the tsconfig path mappings and the
// CI/sync compile-check). These tests fail if any of them drift, so adding a
// module stays a one-line change in the manifest (+ its tsconfig path).

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

interface ManifestEntry {
  name: string;
  public: boolean;
  source: string;
}

/** Parse src/sdk/modules.ts without importing it (it pulls in the whole SDK). */
function parseManifest(): ManifestEntry[] {
  const text = read('src/sdk/modules.ts');
  const arrayBody = text.match(/sdkModules:\s*SdkModule\[\]\s*=\s*\[([\s\S]*?)\];/);
  expect(arrayBody, 'sdkModules array not found in modules.ts').toBeTruthy();
  const entries: ManifestEntry[] = [];
  const re =
    /\{\s*name:\s*'([^']*)',\s*module:[^,]+,\s*public:\s*(true|false),\s*source:\s*'([^']*)'\s*\}/g;
  for (const m of arrayBody![1].matchAll(re)) {
    entries.push({ name: m[1], public: m[2] === 'true', source: m[3] });
  }
  return entries;
}

function parseCompileCheckRegistry(): string[] {
  const text = read('scripts/compile-check.mjs');
  const body = text.match(/const REGISTRY = new Set\(\[([\s\S]*?)\]\);/);
  expect(body, 'REGISTRY set not found in compile-check.mjs').toBeTruthy();
  return [...body![1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

function tsconfigPaths(): Record<string, string[]> {
  // tsconfig.json has no comments, so plain JSON.parse is safe here.
  return JSON.parse(read('tsconfig.json')).compilerOptions.paths;
}

describe('sdk module manifest', () => {
  const manifest = parseManifest();

  it('parses a non-empty manifest', () => {
    expect(manifest.length).toBeGreaterThan(0);
    expect(manifest.map((m) => m.name)).toContain('@ha');
  });

  it('has no duplicate module names', () => {
    const names = manifest.map((m) => m.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('matches the compile-check REGISTRY set exactly', () => {
    const manifestNames = manifest.map((m) => m.name).sort();
    const registryNames = parseCompileCheckRegistry().sort();
    expect(registryNames).toEqual(manifestNames);
  });

  it('public @ha modules map 1:1 onto tsconfig paths', () => {
    const paths = tsconfigPaths();
    const publicNames = manifest.filter((m) => m.public).map((m) => m.name).sort();
    expect(Object.keys(paths).sort()).toEqual(publicNames);
  });

  it('each public module source matches its tsconfig path', () => {
    const paths = tsconfigPaths();
    for (const m of manifest.filter((e) => e.public)) {
      expect(m.source, `source declared for ${m.name}`).toBeTruthy();
      expect(paths[m.name], `tsconfig path for ${m.name}`).toEqual([m.source]);
    }
  });
});
