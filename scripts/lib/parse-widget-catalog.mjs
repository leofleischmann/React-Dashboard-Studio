// Parse WidgetCatalogEntry objects from catalog source files (static text analysis).

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const CATALOG_ARRAY_RE =
  /export const \w+_CATALOG(?:: WidgetCatalogEntry\[\])? = \[([\s\S]*?)\n\];/g;

function splitTopLevelObjects(arrayBody) {
  const objects = [];
  let depth = 0;
  let start = -1;

  for (let i = 0; i < arrayBody.length; i++) {
    const ch = arrayBody[i];
    if (ch === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && start >= 0) {
        objects.push(arrayBody.slice(start, i + 1));
        start = -1;
      }
    }
  }
  return objects;
}

function readStringProp(block, key) {
  const re = new RegExp(`${key}:\\s*['"\`]([^'"\`]+)['"\`]`);
  const m = block.match(re);
  return m?.[1];
}

function readDomains(block) {
  const m = block.match(/domains:\s*\[([^\]]*)\]/);
  if (!m) return [];
  return [...m[1].matchAll(/['"]([^'"]+)['"]/g)].map((x) => x[1]);
}

function readSnippet(block, name, domains) {
  const stringSnippet = block.match(/snippet:\s*['"]([^'"]+)['"]/);
  if (stringSnippet) return { kind: 'static', example: stringSnippet[1] };

  const templateSnippet = block.match(/snippet:\s*\([^)]*\)\s*=>\s*`([^`]+)`/s);
  if (templateSnippet) {
    const exampleId = domains[0] ? `${domains[0]}.beispiel` : 'entity.beispiel';
    return {
      kind: 'template',
      example: templateSnippet[1].replace(/\$\{id\}/g, exampleId),
    };
  }

  const exampleId = domains[0] ? `${domains[0]}.beispiel` : 'entity.beispiel';
  return {
    kind: 'fallback',
    example: `<${name} entityId="${exampleId}" />`,
  };
}

function parseCatalogBlock(block) {
  const name = readStringProp(block, 'name');
  if (!name) return null;

  const label = readStringProp(block, 'label') ?? name;
  const category = readStringProp(block, 'category') ?? 'domain';
  const domains = readDomains(block);
  const inserterDefault = /inserterDefault:\s*true/.test(block);
  const optionalEntity = /optionalEntity:\s*true/.test(block);
  const snippet = readSnippet(block, name, domains);

  return {
    name,
    label,
    category,
    domains,
    inserterDefault,
    optionalEntity,
    snippet,
  };
}

function parseCatalogFile(filePath) {
  const text = readFileSync(filePath, 'utf8');
  const entries = [];

  for (const match of text.matchAll(CATALOG_ARRAY_RE)) {
    const arrayBody = match[1];
    for (const objectBlock of splitTopLevelObjects(arrayBody)) {
      const entry = parseCatalogBlock(objectBlock);
      if (entry) entries.push(entry);
    }
  }

  return entries;
}

/**
 * @param {string} catalogRoot - src/sdk/ui/catalog
 */
export function parseWidgetCatalog(catalogRoot) {
  const entries = [];
  const domainDir = join(catalogRoot, 'domain');

  for (const file of readdirSync(domainDir)) {
    if (!file.endsWith('.ts')) continue;
    entries.push(...parseCatalogFile(join(domainDir, file)));
  }

  for (const file of ['featured.ts', 'composite.tsx']) {
    entries.push(...parseCatalogFile(join(catalogRoot, file)));
  }

  return entries;
}

/** Mirrors widgetNameForDomain() from catalog/index.ts */
export function domainDefaultWidgets(entries) {
  const featured = entries.filter((e) => e.inserterDefault && e.category === 'featured');
  const domain = entries.filter((e) => e.inserterDefault && e.category === 'domain');
  const byDomain = new Map();

  for (const entry of entries) {
    for (const d of entry.domains) {
      if (!byDomain.has(d)) byDomain.set(d, []);
      byDomain.get(d).push(entry.name);
    }
  }

  const defaults = {};
  for (const [d, widgets] of byDomain) {
    const feat = featured.find((e) => e.domains.includes(d));
    if (feat) {
      defaults[d] = feat.name;
      continue;
    }
    const dom = domain.find((e) => e.domains.includes(d));
    if (dom) {
      defaults[d] = dom.name;
      continue;
    }
    defaults[d] = widgets[0] ?? 'EntityRow';
  }

  return defaults;
}
