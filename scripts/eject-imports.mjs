// Convert `@ha/ui` widget imports into ejected #region blocks — in selected files.
//
// Develop comfortably with imports; when a widget is deprecated (or you just want
// to own the code), freeze chosen files: every catalog-widget import becomes an
// inlined, editable component (folded #region, nested widgets cascade-ejected),
// its `@ha/ui` import dropped. Non-widget `@ha/ui` exports (Section, layout,
// WidgetCatalogGrid, …) are left untouched. The reverse (eject → import) is not
// possible, so this is a one-way "freeze".
//
// Usage:
//   node scripts/eject-imports.mjs <file...> [--dry] [--quiet]
//   npm run eject:imports -- default-dashboard/pages/HomePage.tsx

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transform } from 'sucrase';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const REGION_PREFIX = '// #region 🧩 ';
const REGION_SUFFIX = ' (ejected · frei bearbeitbar · kein Auto-Update)';
const REGION_END = '// #endregion';

function loadEjectSources() {
  const path = join(ROOT, 'src/sdk/ui/catalog/eject.generated.ts');
  const text = readFileSync(path, 'utf8');
  const start = text.indexOf('{', text.indexOf('EJECT_SOURCES'));
  return JSON.parse(text.slice(start, text.lastIndexOf('}') + 1));
}

function parseImportLine(line) {
  const m = line.match(/^import\s+(type\s+)?\{([^}]*)\}\s+from\s+'([^']+)'/);
  if (!m) return null;
  const names = m[2]
    .split(',')
    .map((s) => s.trim().replace(/^type\s+/, ''))
    .filter(Boolean);
  return { isType: Boolean(m[1]), module: m[3], names };
}

/** Binding names already imported anywhere in the document. */
function existingImportedNames(doc) {
  const names = new Set();
  const re = /import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+['"][^'"]+['"]/g;
  let m;
  while ((m = re.exec(doc))) {
    for (let part of m[1].split(',')) {
      part = part.trim().replace(/^type\s+/, '');
      if (!part) continue;
      const as = part.match(/\bas\s+(\w+)$/);
      names.add(as ? as[1] : part);
    }
  }
  return names;
}

function lastImportEnd(doc) {
  const re = /^import\b[\s\S]*?from\s+['"][^'"]+['"];?/gm;
  let end = 0;
  let m;
  while ((m = re.exec(doc))) end = m.index + m[0].length;
  return end;
}

/** Cascade-collect a widget's source + every nested catalog widget it imports. */
function collectCascade(rootNames, EJECT) {
  const definitions = [];
  const imports = [];
  const visited = new Set();

  const collect = (widget) => {
    if (visited.has(widget)) return;
    visited.add(widget);
    const src = EJECT[widget];
    if (!src) return;
    definitions.push({ name: widget, body: src.body });
    for (const line of src.imports) {
      const parsed = parseImportLine(line);
      if (!parsed) {
        imports.push(line);
        continue;
      }
      const keep = parsed.names.filter((n) => {
        if (EJECT[n] && n !== widget) {
          collect(n);
          return false;
        }
        return true;
      });
      if (keep.length) {
        const kw = parsed.isType ? 'import type' : 'import';
        imports.push(`${kw} { ${keep.join(', ')} } from '${parsed.module}';`);
      }
    }
  };
  for (const n of rootNames) collect(n);
  return { definitions, imports };
}

/** Import lines for names not already imported, grouped by module. */
function missingImportLines(rawImports, existing) {
  const value = new Map();
  const type = new Map();
  for (const line of rawImports) {
    const parsed = parseImportLine(line);
    if (!parsed) continue;
    const target = parsed.isType ? type : value;
    for (const n of parsed.names) {
      if (existing.has(n)) continue;
      if (!target.has(parsed.module)) target.set(parsed.module, new Set());
      target.get(parsed.module).add(n);
    }
  }
  const lines = [];
  for (const [mod, names] of value)
    lines.push(`import { ${[...names].sort().join(', ')} } from '${mod}';`);
  for (const [mod, names] of type)
    lines.push(`import type { ${[...names].sort().join(', ')} } from '${mod}';`);
  return lines;
}

/** Convert one file's text. Returns { text, ejected[] } or null if nothing to do. */
function convertFile(text, EJECT) {
  // 1. Rewrite each `… from '@ha/ui'` import: strip catalog-widget names.
  const ejectNames = new Set();
  // `[^}]*` (not `[\s\S]*?`) so the capture can't span across other import
  // statements — it isolates exactly this `{ … }` block.
  const re = /import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+'@ha\/ui';?/g;
  const edits = [];
  let m;
  while ((m = re.exec(text))) {
    const names = m[1]
      .split(',')
      .map((s) => s.trim().replace(/^type\s+/, ''))
      .filter(Boolean);
    const keep = [];
    for (const n of names) {
      if (EJECT[n]) ejectNames.add(n);
      else keep.push(n);
    }
    if (keep.length === names.length) continue; // nothing ejectable here
    let end = m.index + m[0].length;
    let replacement;
    if (keep.length === 0) {
      replacement = ''; // drop the whole import; swallow trailing newline
      if (text[end] === '\n') end += 1;
    } else {
      replacement = `import { ${keep.join(', ')} } from '@ha/ui';`;
    }
    edits.push({ start: m.index, end, replacement });
  }
  if (ejectNames.size === 0) return null;

  let out = text;
  for (const e of edits.sort((a, b) => b.start - a.start)) {
    out = out.slice(0, e.start) + e.replacement + out.slice(e.end);
  }

  // 2. Cascade the ejected widgets.
  const { definitions, imports } = collectCascade([...ejectNames], EJECT);

  // 3. Add the imports they need (minus what the file already imports).
  const missing = missingImportLines(imports, existingImportedNames(out));
  if (missing.length) {
    const pos = lastImportEnd(out);
    const block = (pos > 0 ? '\n' : '') + missing.join('\n') + (pos > 0 ? '' : '\n');
    out = out.slice(0, pos) + block + out.slice(pos);
  }

  // 4. Append region blocks for definitions not already present.
  let regions = '';
  for (const def of definitions) {
    const key = REGION_PREFIX + def.name + REGION_SUFFIX;
    if (out.includes(key)) continue;
    regions += `\n\n${key}\n${def.body.trimEnd()}\n${REGION_END}\n`;
  }
  out = out.replace(/\s*$/, '\n') + regions;
  out = out.replace(/\n{3,}/g, '\n\n');

  return { text: out, ejected: definitions.map((d) => d.name) };
}

function main() {
  const args = process.argv.slice(2);
  const dry = args.includes('--dry');
  const quiet = args.includes('--quiet');
  const files = args.filter((a) => !a.startsWith('--'));

  if (files.length === 0) {
    console.error('Usage: node scripts/eject-imports.mjs <file...> [--dry] [--quiet]');
    process.exit(1);
  }

  const EJECT = loadEjectSources();
  let changed = 0;
  let failed = 0;

  for (const file of files) {
    const abs = isAbsolute(file) ? file : resolve(process.cwd(), file);
    let text;
    try {
      text = readFileSync(abs, 'utf8');
    } catch {
      console.error(`✗ ${file}: nicht gefunden`);
      failed++;
      continue;
    }
    const result = convertFile(text, EJECT);
    if (!result) {
      if (!quiet) console.log(`· ${file}: keine @ha/ui-Widget-Importe`);
      continue;
    }
    // Safety: the converted file must still transpile.
    try {
      transform(result.text, { transforms: ['typescript', 'jsx'], jsxRuntime: 'automatic' });
    } catch (e) {
      console.error(`✗ ${file}: Ergebnis kompiliert nicht (${e.message.split('\n')[0]}) — übersprungen`);
      failed++;
      continue;
    }
    if (dry) {
      console.log(`would eject in ${file}: ${result.ejected.join(', ')}`);
    } else {
      writeFileSync(abs, result.text);
      console.log(`✓ ${file}: ejected ${result.ejected.join(', ')}`);
    }
    changed++;
  }

  if (!quiet) {
    console.log(
      `\n${dry ? 'dry-run' : 'fertig'}: ${changed} Datei(en) ${dry ? 'würden geändert' : 'geändert'}${failed ? `, ${failed} Fehler` : ''}.`,
    );
  }
  if (failed) process.exit(1);
}

main();
