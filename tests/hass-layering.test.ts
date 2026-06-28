import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Guards the hass/ layering introduced in the sources/stores/hooks split:
//   - sources/ = framework-agnostic data layer (fetchers + caches + bridges)
//   - stores/  = framework-agnostic reactive state singletons
//   - hooks/   = the React bindings (the only layer allowed to import react)
// Keeping sources/ and stores/ react-free is what lets them be reasoned about
// and tested without a renderer.

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const HASS = join(ROOT, 'src/sdk/hass');

function tsFiles(dir: string): string[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.ts'))
    .map((f) => join(dir, f));
}

describe('hass layering', () => {
  for (const layer of ['sources', 'stores']) {
    it(`${layer}/ stays framework-agnostic (no react import)`, () => {
      const files = tsFiles(join(HASS, layer));
      expect(files.length).toBeGreaterThan(0);
      for (const file of files) {
        const src = readFileSync(file, 'utf8');
        expect(src, `${layer}/${file.split('/').pop()} must not import react`).not.toMatch(
          /from\s+['"]react['"]/,
        );
      }
    });
  }

  it('hooks/ is where the React bindings live', () => {
    const anyHookUsesReact = tsFiles(join(HASS, 'hooks')).some((file) =>
      /from\s+['"]react['"]/.test(readFileSync(file, 'utf8')),
    );
    expect(anyHookUsesReact).toBe(true);
  });
});
