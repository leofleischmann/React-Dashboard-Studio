// Generates editable "eject" sources for every catalog widget — automatically.
//
// For each widget it takes the component's real source file, drops CSS imports,
// rewrites internal relative imports to the public `@ha*` aliases (by resolving
// each imported symbol to the public module that exports it) and strips the
// `export` keywords, so the result is a self-contained component the user can
// paste into a dashboard. No per-widget maintenance: new widgets are picked up
// automatically, exactly like the entity inserter picks up new catalog entries.
//
// CLI: npm run gen:eject-sources

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { transform } from 'sucrase';
import { collectExports } from './lib/parse-ts-exports.mjs';
import { parseWidgetCatalog } from './lib/parse-widget-catalog.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const PUBLIC_MODULES = [
  { alias: '@ha', path: 'src/sdk/hass/hooks/index.ts' },
  { alias: '@ha/format', path: 'src/sdk/format/index.ts' },
  { alias: '@ha/ui', path: 'src/sdk/ui/index.ts' },
  { alias: '@ha/layout', path: 'src/sdk/ui/layout.tsx' },
];

const COMPONENT_GLOBS = [
  'src/sdk/ui/cards/domain',
  'src/sdk/ui/cards/composite',
  'src/sdk/ui/featured',
];
const COMPONENT_SINGLES = [
  'src/sdk/ui/primitives.tsx',
  'src/sdk/ui/charts.tsx',
  'src/sdk/ui/CircularProgress.tsx',
];

/** symbol name → public alias (first match wins, so @ha beats @ha/ui etc.). */
function buildSymbolIndex() {
  const index = new Map();
  for (const mod of PUBLIC_MODULES) {
    const { values, types } = collectExports(join(ROOT, mod.path));
    for (const name of [...values, ...types]) {
      if (!index.has(name)) index.set(name, mod.alias);
    }
  }
  return index;
}

function listComponentFiles() {
  const files = [];
  for (const dir of COMPONENT_GLOBS) {
    const abs = join(ROOT, dir);
    if (!existsSync(abs)) continue;
    for (const f of readdirSync(abs)) {
      if (f.endsWith('.tsx') && f !== 'index.tsx') files.push(join(abs, f));
    }
  }
  for (const f of COMPONENT_SINGLES) {
    const abs = join(ROOT, f);
    if (existsSync(abs)) files.push(abs);
  }
  return files;
}

function parse(file) {
  return ts.createSourceFile(
    file,
    readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
}

/** Map exported component name → defining file. */
function buildNameToFile(files) {
  const map = new Map();
  for (const file of files) {
    const source = parse(file);
    for (const stmt of source.statements) {
      const mods = ts.canHaveModifiers(stmt) ? ts.getModifiers(stmt) : undefined;
      if (!mods?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) continue;
      if (ts.isFunctionDeclaration(stmt) && stmt.name) map.set(stmt.name.text, file);
      if (ts.isVariableStatement(stmt)) {
        for (const d of stmt.declarationList.declarations) {
          if (ts.isIdentifier(d.name)) map.set(d.name.text, file);
        }
      }
    }
  }
  return map;
}

function importedNames(decl) {
  const clause = decl.importClause;
  if (!clause) return { valueNames: [], typeNames: [], hasNamespace: false };
  const valueNames = [];
  const typeNames = [];
  let hasNamespace = false;
  const clauseType = Boolean(clause.isTypeOnly);
  if (clause.name) valueNames.push(clause.name.text); // default import
  const b = clause.namedBindings;
  if (b) {
    if (ts.isNamespaceImport(b)) hasNamespace = true;
    else
      for (const el of b.elements) {
        // honour per-specifier `type` (e.g. `import { foo, type Bar }`)
        (el.isTypeOnly || clauseType ? typeNames : valueNames).push(el.name.text);
      }
  }
  return { valueNames, typeNames, hasNamespace };
}

/** All identifier names referenced anywhere inside a node. */
function referencedIdentifiers(node) {
  const refs = new Set();
  const walk = (n) => {
    // Skip the property name in `a.b` (b is not a free identifier).
    if (ts.isPropertyAccessExpression(n)) {
      walk(n.expression);
      return;
    }
    if (ts.isIdentifier(n)) refs.add(n.text);
    ts.forEachChild(n, walk);
  };
  walk(node);
  return refs;
}

function declaredNames(stmt) {
  if (ts.isFunctionDeclaration(stmt) && stmt.name) return [stmt.name.text];
  if (ts.isClassDeclaration(stmt) && stmt.name) return [stmt.name.text];
  if (ts.isTypeAliasDeclaration(stmt)) return [stmt.name.text];
  if (ts.isInterfaceDeclaration(stmt)) return [stmt.name.text];
  if (ts.isEnumDeclaration(stmt)) return [stmt.name.text];
  if (ts.isVariableStatement(stmt)) {
    return stmt.declarationList.declarations
      .filter((d) => ts.isIdentifier(d.name))
      .map((d) => d.name.text);
  }
  return [];
}

/** Parse a component file into top-level declarations + imports (once per file). */
function analyzeFile(file) {
  const source = parse(file);
  const text = source.getFullText();
  const decls = [];
  const imports = [];

  for (const stmt of source.statements) {
    if (ts.isImportDeclaration(stmt)) {
      const spec = stmt.moduleSpecifier.getText(source).slice(1, -1);
      imports.push({ spec, ...importedNames(stmt) });
      continue;
    }
    const names = declaredNames(stmt);
    if (names.length === 0) continue;
    // include a leading JSDoc/// comment block if directly above the declaration
    let start = stmt.getStart(source);
    const comments = ts.getLeadingCommentRanges(text, stmt.getFullStart());
    if (comments?.length) start = comments[0].pos;
    const mods = ts.canHaveModifiers(stmt) ? ts.getModifiers(stmt) : undefined;
    const exp = mods?.find((m) => m.kind === ts.SyntaxKind.ExportKeyword);
    decls.push({
      names,
      refs: referencedIdentifiers(stmt),
      start,
      end: stmt.getEnd(),
      exportAt: exp ? exp.getStart(source) : -1,
    });
  }
  return { text, decls, imports };
}

/**
 * Tree-shaken eject: the requested component plus only the local declarations it
 * transitively references, with internal imports rewritten to public aliases.
 * Returns { code } or { error }.
 */
function ejectComponent(analysis, name, symbolIndex) {
  const { text, decls, imports } = analysis;
  const byName = new Map();
  for (const d of decls) for (const n of d.names) byName.set(n, d);
  if (!byName.has(name)) return { error: 'declaration not found in file' };

  // transitive closure over local declaration names
  const keep = new Set();
  const stack = [byName.get(name)];
  while (stack.length) {
    const d = stack.pop();
    if (keep.has(d)) continue;
    keep.add(d);
    for (const ref of d.refs) {
      const dep = byName.get(ref);
      if (dep && !keep.has(dep)) stack.push(dep);
    }
  }
  const kept = [...keep].sort((a, b) => a.start - b.start);

  // symbols actually used by the kept declarations
  const used = new Set();
  for (const d of kept) for (const r of d.refs) used.add(r);

  // resolve imports → public aliases, restricted to used symbols
  const valueImports = new Map();
  const typeImports = new Map();
  const addImport = (map, alias, n) => {
    if (!map.has(alias)) map.set(alias, new Set());
    map.get(alias).add(n);
  };
  for (const imp of imports) {
    if (imp.spec.endsWith('.css')) continue;
    if (imp.hasNamespace) {
      if (imp.spec.startsWith('.')) return { error: `namespace import from ${imp.spec}` };
      continue;
    }
    const relative = imp.spec.startsWith('.');
    for (const [list, target] of [
      [imp.valueNames, valueImports],
      [imp.typeNames, typeImports],
    ]) {
      for (const n of list) {
        if (!used.has(n)) continue;
        if (!relative) {
          addImport(target, imp.spec, n);
          continue;
        }
        const alias = symbolIndex.get(n);
        if (!alias) return { error: `unmapped symbol "${n}" from ${imp.spec}` };
        addImport(target, alias, n);
      }
    }
  }

  // assemble body: kept declarations in source order, export keyword removed
  const blocks = kept.map((d) => {
    let slice = text.slice(d.start, d.end);
    if (d.exportAt >= 0) {
      const rel = d.exportAt - d.start;
      slice = slice.slice(0, rel) + slice.slice(rel).replace(/^export\s+/, '');
    }
    return slice.trim();
  });
  const body = blocks.join('\n\n');

  try {
    transform(body, { transforms: ['typescript', 'jsx'], jsxRuntime: 'classic' });
  } catch (e) {
    return { error: `transpile failed: ${e.message.split('\n')[0]}` };
  }

  const importLines = [];
  for (const [alias, names] of valueImports)
    importLines.push(`import { ${[...names].sort().join(', ')} } from '${alias}';`);
  for (const [alias, names] of typeImports)
    importLines.push(`import type { ${[...names].sort().join(', ')} } from '${alias}';`);

  return { imports: importLines.sort(), body };
}

export function generateEjectSources(options = {}) {
  const root = options.root ?? ROOT;
  const symbolIndex = buildSymbolIndex();
  const files = listComponentFiles();
  const nameToFile = buildNameToFile(files);

  const widgets = parseWidgetCatalog(join(root, 'src/sdk/ui/catalog'));
  const names = [...new Set(widgets.map((w) => w.name))].sort();

  const analysisCache = new Map();
  const sources = {};
  const skipped = [];

  for (const name of names) {
    const file = nameToFile.get(name);
    if (!file) {
      skipped.push([name, 'no source file found']);
      continue;
    }
    if (!analysisCache.has(file)) analysisCache.set(file, analyzeFile(file));
    const result = ejectComponent(analysisCache.get(file), name, symbolIndex);
    if (result.error) {
      skipped.push([name, result.error]);
      continue;
    }
    sources[name] = { imports: result.imports, body: result.body };
  }

  const out = [
    '// AUTO-GENERATED by scripts/gen-eject-sources.mjs — do not edit by hand.',
    '// Editable component sources for the gallery eject action.',
    '',
    'export type EjectSource = { imports: string[]; body: string };',
    '',
    'export const EJECT_SOURCES: Record<string, EjectSource> = ',
    JSON.stringify(sources, null, 2),
    ';',
    '',
  ].join('\n');

  const outPath = join(root, 'src/sdk/ui/catalog/eject.generated.ts');
  writeFileSync(outPath, out);

  console.log(
    `✓ Eject-Quellen → src/sdk/ui/catalog/eject.generated.ts (${Object.keys(sources).length}/${names.length} Widgets)`,
  );
  if (skipped.length) {
    console.log(`  übersprungen (${skipped.length}):`);
    for (const [name, reason] of skipped) console.log(`    · ${name}: ${reason}`);
  }
  return { sources, skipped };
}

const isMain =
  process.argv[1] && join(process.argv[1]) === join(fileURLToPath(import.meta.url));
if (isMain) {
  try {
    generateEjectSources();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
