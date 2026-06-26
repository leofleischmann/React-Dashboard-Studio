// Convert `@ha/ui` widget imports into ejected #region blocks — in selected files.
//
// Develop comfortably with imports; when a widget is deprecated (or you just want
// to own the code), freeze chosen files: a catalog-widget import becomes an
// inlined, editable component (folded #region) and its `@ha/ui` import is dropped.
// Non-widget `@ha/ui` exports (Section, layout, WidgetCatalogGrid, …) and relative
// imports are left untouched. One-way by design (eject → import is not possible).
//
// Pick exactly what to freeze — files AND widgets:
//   --only A,B     eject only these widgets (others stay imported)
//   --except A,B   eject all imported widgets except these
//   --list         just show which @ha/ui widgets each file could eject
//   --dry          preview without writing
//   --quiet        only report changes
//
// Nested widgets are ejected only if they are also selected; otherwise they stay
// an `@ha/ui` import. With no --only/--except, the file is fully frozen (all
// imported widgets + their nested widgets cascade).
//
//   node scripts/eject-imports.mjs <file...> [options]
//   npm run eject:imports -- default-dashboard/pages/HomePage.tsx --only Gauge,SunArc

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transform } from 'sucrase';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const REGION_PREFIX = '// #region 🧩 ';
const REGION_SUFFIX = ' (ejected · frei bearbeitbar · kein Auto-Update)';
const REGION_END = '// #endregion';

const HA_UI_IMPORT_RE = /import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+'@ha\/ui';?/g;
const ANY_IMPORT_RE = /import\s+(type\s+)?\{([^}]*)\}\s+from\s+'([^']+)';?/g;

export function loadEjectSources() {
  const path = join(ROOT, 'src/sdk/ui/catalog/eject.generated.ts');
  const text = readFileSync(path, 'utf8');
  const start = text.indexOf('{', text.indexOf('EJECT_SOURCES'));
  return JSON.parse(text.slice(start, text.lastIndexOf('}') + 1));
}

function parseNames(inner) {
  return inner
    .split(',')
    .map((s) => s.trim().replace(/^type\s+/, ''))
    .filter(Boolean);
}

function parseImportLine(line) {
  const m = line.match(/^import\s+(type\s+)?\{([^}]*)\}\s+from\s+'([^']+)'/);
  if (!m) return null;
  return { isType: Boolean(m[1]), module: m[3], names: parseNames(m[2]) };
}

/** Binding names already imported anywhere in the document. */
function existingImportedNames(doc) {
  const names = new Set();
  for (const m of doc.matchAll(ANY_IMPORT_RE)) {
    for (let part of m[2].split(',')) {
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

const addTo = (map, key, val) => {
  if (!map.has(key)) map.set(key, new Set());
  map.get(key).add(val);
};

/** Catalog-widget names imported from `@ha/ui` in this file. */
function ejectableWidgets(text, EJECT) {
  const set = new Set();
  for (const m of text.matchAll(HA_UI_IMPORT_RE)) {
    for (const n of parseNames(m[1])) if (EJECT[n]) set.add(n);
  }
  return set;
}

/** Catalog widgets a widget's source imports (its nested widgets). */
function nestedWidgetsOf(name, EJECT) {
  const out = [];
  for (const line of EJECT[name].imports) {
    const p = parseImportLine(line);
    if (!p) continue;
    for (const n of p.names) if (EJECT[n] && n !== name) out.push(n);
  }
  return out;
}

/** Closure of widgets to eject: seeds + nested, restricted by `shouldEject`. */
function computeEjectSet(seeds, shouldEject, EJECT) {
  const S = new Set();
  const stack = [...seeds].filter(shouldEject);
  while (stack.length) {
    const w = stack.pop();
    if (S.has(w)) continue;
    S.add(w);
    for (const n of nestedWidgetsOf(w, EJECT)) if (shouldEject(n) && !S.has(n)) stack.push(n);
  }
  return S;
}

/** Rewrite `@ha/ui` imports, dropping the names in `remove` (ejected widgets). */
function stripHaUiNames(text, remove) {
  return text.replace(
    /[ \t]*import\s+(type\s+)?\{([^}]*)\}\s+from\s+'@ha\/ui';?\n?/g,
    (full, typeKw, inner) => {
      const names = parseNames(inner);
      const keep = names.filter((n) => !remove.has(n));
      if (keep.length === 0) return '';
      if (keep.length === names.length) return full;
      return `import ${typeKw ? 'type ' : ''}{ ${keep.join(', ')} } from '@ha/ui';\n`;
    },
  );
}

/** Add missing names, merging into an existing same-module import when present. */
function addImports(text, valueByMod, typeByMod) {
  const existing = existingImportedNames(text);
  const stmts = [];
  for (const m of text.matchAll(ANY_IMPORT_RE)) {
    const open = m.index + m[0].indexOf('{') + 1;
    const close = m.index + m[0].lastIndexOf('}');
    stmts.push({ isType: Boolean(m[1]), module: m[3], namesStart: open, namesEnd: close });
  }

  const edits = [];
  const newLines = [];
  const handle = (byMod, isType) => {
    for (const [mod, names] of byMod) {
      const missing = [...names].filter((n) => !existing.has(n));
      if (missing.length === 0) continue;
      missing.forEach((n) => existing.add(n));
      const stmt = stmts.find((s) => s.module === mod && s.isType === isType);
      if (!stmt) {
        newLines.push(`import ${isType ? 'type ' : ''}{ ${missing.sort().join(', ')} } from '${mod}';`);
        continue;
      }
      const inner = text.slice(stmt.namesStart, stmt.namesEnd);
      if (inner.includes('\n')) {
        const indent = inner.match(/\n([ \t]+)\S/)?.[1] ?? '  ';
        const trimmed = inner.replace(/\s*$/, '');
        const comma = trimmed.endsWith(',') ? '' : ',';
        const block = `${trimmed}${comma}\n${missing.map((n) => indent + n + ',').join('\n')}\n`;
        edits.push({ start: stmt.namesStart, end: stmt.namesEnd, replacement: block });
      } else {
        const trimmed = inner.replace(/\s*$/, '').replace(/,$/, '');
        edits.push({
          start: stmt.namesStart,
          end: stmt.namesEnd,
          replacement: `${trimmed}, ${missing.join(', ')} `,
        });
      }
    }
  };
  handle(valueByMod, false);
  handle(typeByMod, true);

  let out = text;
  for (const e of edits.sort((a, b) => b.start - a.start)) {
    out = out.slice(0, e.start) + e.replacement + out.slice(e.end);
  }
  if (newLines.length) {
    const pos = lastImportEnd(out);
    out = out.slice(0, pos) + '\n' + newLines.join('\n') + out.slice(pos);
  }
  return out;
}

/** Convert one file. Returns { text, ejected[], kept[] } or null if nothing to do. */
export function convertFile(text, EJECT, shouldEject) {
  const imported = ejectableWidgets(text, EJECT);
  const seeds = [...imported].filter(shouldEject);
  if (seeds.length === 0) return null;

  const S = computeEjectSet(imported, shouldEject, EJECT);

  // imports the ejected bodies need; nested widgets not in S stay @ha/ui imports
  const valueByMod = new Map();
  const typeByMod = new Map();
  for (const w of S) {
    for (const line of EJECT[w].imports) {
      const p = parseImportLine(line);
      if (!p) continue;
      for (const n of p.names) {
        if (EJECT[n]) {
          if (!S.has(n)) addTo(valueByMod, '@ha/ui', n);
        } else {
          addTo(p.isType ? typeByMod : valueByMod, p.module, n);
        }
      }
    }
  }

  let out = stripHaUiNames(text, S);
  out = addImports(out, valueByMod, typeByMod);

  let regions = '';
  for (const w of S) {
    const key = REGION_PREFIX + w + REGION_SUFFIX;
    if (out.includes(key)) continue;
    regions += `\n\n${key}\n${EJECT[w].body.trimEnd()}\n${REGION_END}\n`;
  }
  out = out.replace(/\s*$/, '\n') + regions;
  out = out.replace(/\n{3,}/g, '\n\n');

  const kept = [...imported].filter((n) => !S.has(n));
  return { text: out, ejected: [...S], kept };
}

function parseList(args, flag) {
  const i = args.indexOf(flag);
  if (i === -1) return null;
  const val = args[i + 1];
  if (!val || val.startsWith('--')) return new Set();
  return new Set(val.split(',').map((s) => s.trim()).filter(Boolean));
}

function main() {
  const args = process.argv.slice(2);
  const dry = args.includes('--dry');
  const quiet = args.includes('--quiet');
  const list = args.includes('--list');
  const only = parseList(args, '--only');
  const except = parseList(args, '--except');

  const consumed = new Set(['--only', '--except']);
  const flagValues = new Set();
  for (let i = 0; i < args.length; i++) if (consumed.has(args[i])) flagValues.add(args[i + 1]);
  const files = args.filter((a) => !a.startsWith('--') && !flagValues.has(a));

  if (files.length === 0) {
    console.error('Usage: node scripts/eject-imports.mjs <file...> [--only A,B | --except A,B] [--list] [--dry] [--quiet]');
    process.exit(1);
  }
  if (only && except) {
    console.error('--only und --except schließen sich aus.');
    process.exit(1);
  }

  const EJECT = loadEjectSources();
  const shouldEject = only ? (n) => only.has(n) : except ? (n) => !except.has(n) : () => true;

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

    if (list) {
      const widgets = [...ejectableWidgets(text, EJECT)].sort();
      console.log(`${file}: ${widgets.length ? widgets.join(', ') : '— keine @ha/ui-Widgets'}`);
      continue;
    }

    const result = convertFile(text, EJECT, shouldEject);
    if (!result) {
      if (!quiet) console.log(`· ${file}: nichts zu ejecten`);
      continue;
    }
    try {
      transform(result.text, { transforms: ['typescript', 'jsx'], jsxRuntime: 'automatic' });
    } catch (e) {
      console.error(`✗ ${file}: Ergebnis kompiliert nicht (${e.message.split('\n')[0]}) — übersprungen`);
      failed++;
      continue;
    }

    const keptNote = result.kept.length ? ` · behalten als Import: ${result.kept.join(', ')}` : '';
    if (dry) {
      console.log(`would eject in ${file}: ${result.ejected.join(', ')}${keptNote}`);
    } else {
      writeFileSync(abs, result.text);
      console.log(`✓ ${file}: ejected ${result.ejected.join(', ')}${keptNote}`);
    }
    changed++;
  }

  if (!quiet && !list) {
    console.log(
      `\n${dry ? 'dry-run' : 'fertig'}: ${changed} Datei(en) ${dry ? 'würden geändert' : 'geändert'}${failed ? `, ${failed} Fehler` : ''}.`,
    );
  }
  if (failed) process.exit(1);
}

const isMain =
  process.argv[1] && join(process.argv[1]) === join(fileURLToPath(import.meta.url));
if (isMain) main();
