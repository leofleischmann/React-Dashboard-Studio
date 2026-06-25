// Generates machine-readable SDK reference + markdown for humans and AI tools.
// CLI: npm run gen:sdk-reference

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectExports } from './lib/parse-ts-exports.mjs';
import {
  domainDefaultWidgets,
  parseWidgetCatalog,
} from './lib/parse-widget-catalog.mjs';
import { DASHBOARD_DIR } from './dashboard-local.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOCS_DIR = join(ROOT, 'docs');
const GENERATED_VERSION = new Date().toISOString();

function readEntityActions() {
  const text = readFileSync(join(ROOT, 'src/sdk/entityActions.ts'), 'utf8');
  const block = text.match(/export const ENTITY_ACTION[^=]*=\s*\{([\s\S]*?)\};/);
  if (!block) return {};
  const actions = {};
  for (const m of block[1].matchAll(/(\w+):\s*'([^']+)'/g)) {
    actions[m[1]] = m[2];
  }
  return actions;
}

function readAvailableModules() {
  const text = readFileSync(join(ROOT, 'src/sdk/runtime.ts'), 'utf8');
  const registry = text.match(/export const registry[^=]*=\s*\{([\s\S]*?)\};/);
  if (!registry) return [];
  return [...registry[1].matchAll(/'(@ha[^']*)':/g)].map((m) => m[1]);
}

function widgetImportStatement(widgetNames) {
  return `import { ${widgetNames.join(', ')} } from '@ha/ui';`;
}

function layoutImportStatement(exports) {
  const layoutNames = exports.values.filter((n) =>
    ['PageShell', 'Tabs', 'Stack', 'Row', 'ResponsiveGrid', 'useHashRoute', 'RoutedPageShell'].includes(
      n,
    ),
  );
  return `import { ${layoutNames.join(', ')} } from '@ha/layout';`;
}

function buildMarkdown(manifest) {
  const lines = [
    '# Home Assistant Dashboard Studio — SDK Reference',
    '',
    `> Automatisch generiert von \`npm run gen:sdk-reference\` · ${manifest.generatedAt}`,
    '',
    'Maschinenlesbare Version: [`sdk-reference.json`](./sdk-reference.json)',
    '',
    '## Module',
    '',
    '| Modul | Werte | Typen |',
    '| --- | --- | --- |',
  ];

  for (const mod of manifest.modules) {
    lines.push(
      `| \`${mod.id}\` | ${mod.exports.values.length} | ${mod.exports.types.length} |`,
    );
  }

  lines.push('', '## Entity-Inserter Modi', '', '| Modus | Beispiel |', '| --- | --- |');
  for (const mode of manifest.entityInserter.modes) {
    lines.push(`| ${mode.label} | \`${mode.example}\` |`);
  }

  lines.push('', '## Widgets', '');
  const byCategory = new Map();
  for (const w of manifest.widgets) {
    const cat = w.category ?? 'domain';
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat).push(w);
  }

  for (const [cat, widgets] of [...byCategory.entries()].sort()) {
    lines.push(`### ${cat}`, '', '| Widget | Domains | Snippet |', '| --- | --- | --- |');
    for (const w of widgets) {
      const domains = w.domains.length ? w.domains.join(', ') : '—';
      lines.push(`| **${w.label}** (\`${w.name}\`) | ${domains} | \`${w.snippet.example}\` |`);
    }
    lines.push('');
  }

  lines.push('## Domain → Standard-Widget', '', '| Domain | Widget |', '| --- | --- |');
  for (const [domain, widget] of Object.entries(manifest.domainDefaultWidgets).sort()) {
    lines.push(`| \`${domain}\` | \`${widget}\` |`);
  }

  lines.push('', '## Hooks (`@ha`)', '');
  const ha = manifest.modules.find((m) => m.id === '@ha');
  if (ha) {
    lines.push('```');
    lines.push(ha.exports.values.join(', '));
    lines.push('```');
  }

  lines.push('', '## Layout (`@ha/layout`)', '');
  const layout = manifest.modules.find((m) => m.id === '@ha/layout');
  if (layout) {
    lines.push('```');
    lines.push(layout.exports.values.join(', '));
    lines.push('```');
    lines.push('', `\`${manifest.importHints.layout}\``);
  }

  lines.push('', '## Format (`@ha/format`)', '');
  const format = manifest.modules.find((m) => m.id === '@ha/format');
  if (format) {
    lines.push('```');
    lines.push(format.exports.values.join(', '));
    lines.push('```');
  }

  lines.push('', '## Charts (`@ha/ui`)', '');
  lines.push('```');
  lines.push(manifest.charts.join(', '));
  lines.push('```');
  lines.push('', `\`${manifest.importHints.widgets}\``);

  return lines.join('\n');
}

/**
 * @param {{ root?: string, writeDashboard?: boolean }} [options]
 */
export function generateSdkReference(options = {}) {
  const root = options.root ?? ROOT;
  const catalogRoot = join(root, 'src/sdk/ui/catalog');
  const widgets = parseWidgetCatalog(catalogRoot);
  const widgetNames = [...new Set(widgets.map((w) => w.name))].sort();

  const moduleEntries = [
    { id: '@ha', path: join(root, 'src/sdk/hass/hooks/index.ts') },
    { id: '@ha/ui', path: join(root, 'src/sdk/ui/index.ts') },
    { id: '@ha/layout', path: join(root, 'src/sdk/ui/layout.tsx') },
    { id: '@ha/format', path: join(root, 'src/sdk/format/index.ts') },
  ];

  const modules = moduleEntries.map(({ id, path }) => ({
    id,
    source: path.replace(root + '/', '').replace(root + '\\', ''),
    exports: collectExports(path),
  }));

  const layoutMod = modules.find((m) => m.id === '@ha/layout');
  const uiMod = modules.find((m) => m.id === '@ha/ui');
  const charts = (uiMod?.exports.values ?? []).filter((n) => n === 'SparkChart');

  const exampleId = 'sensor.temperatur';
  const manifest = {
    schemaVersion: 1,
    generatedAt: GENERATED_VERSION,
    availableModules: readAvailableModules(),
    modules,
    widgets,
    domainDefaultWidgets: domainDefaultWidgets(widgets),
    entityActions: readEntityActions(),
    charts,
    entityInserter: {
      modes: [
        { id: 'value', label: 'Wert', example: `useEntity('${exampleId}')?.state` },
        { id: 'template', label: 'Template', example: `useTemplate("{{ states('${exampleId}') }}").value` },
        { id: 'action', label: 'Aktion', example: `callService('light', 'toggle', { entity_id: 'light.wohnzimmer' })` },
        { id: 'id', label: 'nur ID', example: `'${exampleId}'` },
        {
          id: 'widget',
          label: 'Widget',
          example: `<Gauge entityId="${exampleId}" />`,
        },
      ],
    },
    importHints: {
      widgets: widgetImportStatement(widgetNames),
      layout: layoutImportStatement(layoutMod?.exports ?? { values: [] }),
    },
  };

  const docsDir = join(root, 'docs');
  mkdirSync(docsDir, { recursive: true });

  const jsonPath = join(docsDir, 'sdk-reference.json');
  const mdPath = join(docsDir, 'sdk-reference.md');
  writeFileSync(jsonPath, JSON.stringify(manifest, null, 2) + '\n');
  writeFileSync(mdPath, buildMarkdown(manifest) + '\n');

  console.log(`✓ SDK-Referenz → docs/sdk-reference.json (${widgets.length} Widgets)`);
  console.log('✓ SDK-Referenz → docs/sdk-reference.md');

  if (options.writeDashboard !== false && existsSync(DASHBOARD_DIR)) {
    mkdirSync(DASHBOARD_DIR, { recursive: true });
    const dashJson = join(DASHBOARD_DIR, 'SDK-REFERENCE.json');
    const dashMd = join(DASHBOARD_DIR, 'SDK-REFERENCE.md');
    writeFileSync(dashJson, JSON.stringify(manifest, null, 2) + '\n');
    writeFileSync(dashMd, buildMarkdown(manifest) + '\n');
    console.log('✓ SDK-Referenz → dashboard/SDK-REFERENCE.json');
  }

  return manifest;
}

const isMain =
  process.argv[1] &&
  join(process.argv[1]) === join(fileURLToPath(import.meta.url));

if (isMain) {
  try {
    generateSdkReference({ writeDashboard: existsSync(join(ROOT, 'dashboard')) });
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
