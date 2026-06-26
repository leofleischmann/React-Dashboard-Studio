import { describe, it, expect, vi } from 'vitest';
import { transform } from 'sucrase';

// The catalog pulls in React widget modules + CSS; stub it so we test the pure
// eject logic (which only needs the generated EJECT_SOURCES data).
vi.mock('../src/sdk/ui/catalog', () => ({
  WIDGET_CATALOG: [],
  catalogSnippet: () => '',
  catalogSourceOverride: () => null,
  widgetNameForDomain: () => '',
}));

import {
  computeEjectChanges,
  freezeImports,
  freezableWidgets,
  type EjectInsert,
} from '../src/studio/ejectInsert';

type Change = { from: number; to: number; insert: string };
const apply = (doc: string, changes: Change[]) => {
  let out = doc;
  for (const c of [...changes].sort((a, b) => b.from - a.from)) {
    out = out.slice(0, c.from) + c.insert + out.slice(c.to);
  }
  return out;
};
const duplicateBindings = (s: string) => {
  const count: Record<string, number> = {};
  const dups: string[] = [];
  for (const m of s.matchAll(/import\s+(?:type\s+)?\{([^}]*)\}\s+from/g)) {
    for (let n of m[1].split(',')) {
      n = n.trim().replace(/^type\s+/, '');
      if (!n) continue;
      count[n] = (count[n] ?? 0) + 1;
      if (count[n] === 2) dups.push(n);
    }
  }
  return dups;
};
const transpiles = (s: string) =>
  transform(s, { transforms: ['typescript', 'jsx'], jsxRuntime: 'automatic' });

describe('computeEjectChanges', () => {
  const eject: EjectInsert = {
    name: 'Gauge',
    usage: '<Gauge entityId="sensor.x" />',
    imports: ["import { num, stateNumber } from '@ha/format';", "import { useEntity } from '@ha';"],
    definitions: [{ name: 'Gauge', body: 'function Gauge() {\n  return null;\n}' }],
  };
  const doc = `import { useEntity } from '@ha';\nimport { num } from '@ha/format';\n\nexport default function Page() {\n  return <div>HERE</div>;\n}\n`;
  const cursor = doc.indexOf('HERE');

  it('merges missing imports into the existing module line (no duplicates)', () => {
    const out = apply(doc, computeEjectChanges(doc, cursor, cursor, eject).changes);
    expect(out.match(/from '@ha\/format'/g)).toHaveLength(1);
    expect(out).toContain("import { num, stateNumber } from '@ha/format';");
    expect(duplicateBindings(out)).toEqual([]);
    expect(() => transpiles(out)).not.toThrow();
  });

  it('puts the cursor right after the inserted usage tag', () => {
    const { changes, selection } = computeEjectChanges(doc, cursor, cursor, eject);
    const out = apply(doc, changes);
    expect(out.slice(selection - eject.usage.length, selection)).toBe(eject.usage);
  });

  it('appends a folded region and dedupes on re-insert', () => {
    const once = apply(doc, computeEjectChanges(doc, cursor, cursor, eject).changes);
    expect(once.match(/#region/g)).toHaveLength(1);
    const c2 = once.indexOf('HERE');
    const twice = apply(once, computeEjectChanges(once, c2, c2, eject).changes);
    expect(twice.match(/#region/g)).toHaveLength(1);
  });
});

describe('freezeImports', () => {
  const file = `import { Section, Gauge, WeatherNow } from '@ha/ui';\n\nexport default function P() {\n  return (\n    <Section>\n      <Gauge entityId="sensor.x" />\n      <WeatherNow entityId="weather.home" />\n    </Section>\n  );\n}\n`;

  it('ejects imported widgets + cascade and drops their @ha/ui import', () => {
    const r = freezeImports(file)!;
    expect(r).not.toBeNull();
    expect(r.ejected).toEqual(expect.arrayContaining(['Gauge', 'WeatherNow', 'WeatherForecastRow']));
    expect(r.text).toContain("import { Section } from '@ha/ui';"); // non-widget stays
    expect(r.text).not.toMatch(/\{[^}]*\bGauge\b[^}]*\}\s+from '@ha\/ui'/);
    expect(duplicateBindings(r.text)).toEqual([]);
    expect(() => transpiles(r.text)).not.toThrow();
  });

  it('reports the cascade set via freezableWidgets', () => {
    expect(freezableWidgets(file)).toEqual(expect.arrayContaining(['WeatherNow', 'WeatherForecastRow']));
  });

  it('returns null when there are no @ha/ui widgets', () => {
    expect(freezeImports("import { useEntity } from '@ha';\n")).toBeNull();
  });
});
