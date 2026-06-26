import { describe, it, expect, vi } from 'vitest';
import { convertFile, loadEjectSources } from '../scripts/eject-imports.mjs';

vi.mock('../src/sdk/ui/catalog', () => ({
  WIDGET_CATALOG: [],
  catalogSnippet: () => '',
  catalogSourceOverride: () => null,
  widgetNameForDomain: () => '',
}));

import { freezeImports } from '../src/studio/ejectInsert';

// Guard against the CLI (.mjs) and studio (.ts) freeze implementations drifting:
// for the same file they must produce byte-identical output.
describe('CLI freeze == studio freeze', () => {
  const EJECT = loadEjectSources();
  const samples = [
    `import { Section, Gauge, WeatherNow } from '@ha/ui';\n\nexport default function P() {\n  return <Section><Gauge entityId="s" /><WeatherNow entityId="w" /></Section>;\n}\n`,
    `import { useEntity } from '@ha';\nimport { SunArc, LightTile } from '@ha/ui';\n\nexport default function P() {\n  return <div><SunArc /><LightTile entityId="l" /></div>;\n}\n`,
    `import {\n  EnergyDeviceCard,\n  Stat,\n} from '@ha/ui';\n\nexport default function P() {\n  return <EnergyDeviceCard entityId="sensor.p" />;\n}\n`,
  ];

  samples.forEach((sample, i) => {
    it(`sample ${i}: identical output`, () => {
      const cli = convertFile(sample, EJECT, () => true);
      const studio = freezeImports(sample);
      expect(studio?.text).toBe(cli?.text);
      expect([...(studio?.ejected ?? [])].sort()).toEqual([...(cli?.ejected ?? [])].sort());
    });
  });
});
