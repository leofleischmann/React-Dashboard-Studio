import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Drift guard for the hand-maintained @ha hook surface. The hooks/index.ts
// barrel must re-export every public React hook declared under hooks/. Helpers
// that are intentionally internal opt out with an `@internal` JSDoc tag (e.g.
// the shared useSyncExternalStore wrappers in restStore.ts). This catches the
// classic "added a hook, forgot to surface it" regression.

const HOOKS_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '../src/sdk/hass/hooks',
);

/** [name, isInternal] for every `export function/const use*` in a file. */
function exportedHooks(src: string): Array<{ name: string; internal: boolean }> {
  const re = /(\/\*\*[\s\S]*?\*\/\s*)?export\s+(?:function|const)\s+(use[A-Z]\w*)/g;
  const out: Array<{ name: string; internal: boolean }> = [];
  for (const m of src.matchAll(re)) {
    out.push({ name: m[2], internal: Boolean(m[1] && m[1].includes('@internal')) });
  }
  return out;
}

describe('hooks barrel surface', () => {
  const barrel = readFileSync(join(HOOKS_DIR, 'index.ts'), 'utf8');
  const files = readdirSync(HOOKS_DIR).filter(
    (f) => f.endsWith('.ts') && f !== 'index.ts',
  );

  const publicHooks: string[] = [];
  for (const file of files) {
    for (const hook of exportedHooks(readFileSync(join(HOOKS_DIR, file), 'utf8'))) {
      if (!hook.internal) publicHooks.push(hook.name);
    }
  }

  it('finds the public hooks to check', () => {
    expect(publicHooks).toContain('useEntity');
    expect(publicHooks.length).toBeGreaterThan(10);
  });

  it('re-exports every public hook from index.ts', () => {
    const missing = publicHooks.filter((name) => !barrel.includes(name));
    expect(missing, `not re-exported by hooks/index.ts: ${missing.join(', ')}`).toEqual(
      [],
    );
  });
});
