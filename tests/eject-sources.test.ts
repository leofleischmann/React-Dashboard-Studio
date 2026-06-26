import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { transform } from 'sucrase';
import { parseWidgetCatalog } from '../scripts/lib/parse-widget-catalog.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const text = readFileSync(join(root, 'src/sdk/ui/catalog/eject.generated.ts'), 'utf8');
const EJECT: Record<string, { imports: string[]; body: string }> = JSON.parse(
  text.slice(text.indexOf('{', text.indexOf('EJECT_SOURCES')), text.lastIndexOf('}') + 1),
);
const catalogNames = [
  ...new Set(parseWidgetCatalog(join(root, 'src/sdk/ui/catalog')).map((w) => w.name)),
];

describe('eject.generated', () => {
  it('has an eject source for every catalog widget (0 skips)', () => {
    expect(catalogNames.filter((n) => !EJECT[n])).toEqual([]);
  });

  it('every ejected body transpiles (typescript + jsx)', () => {
    for (const [name, src] of Object.entries(EJECT)) {
      try {
        transform(src.body, { transforms: ['typescript', 'jsx'], jsxRuntime: 'automatic' });
      } catch (e) {
        throw new Error(`${name} does not transpile: ${(e as Error).message.split('\n')[0]}`);
      }
    }
  });

  it('contains no leftover debug logging', () => {
    for (const [name, src] of Object.entries(EJECT)) {
      expect(src.body, name).not.toContain('[Debug');
    }
  });
});
