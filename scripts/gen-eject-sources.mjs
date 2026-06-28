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

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
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

const SIBLING_EXTS = ['', '.tsx', '.ts', '.jsx', '.js', '/index.tsx', '/index.ts'];

/** Resolve a relative import spec from `fromFile` to an actual file, or null. */
function resolveRelativeFile(fromFile, spec) {
  const base = join(dirname(fromFile), spec);
  for (const ext of SIBLING_EXTS) {
    const cand = base + ext;
    if (existsSync(cand) && statSync(cand).isFile()) return cand;
  }
  return null;
}

/**
 * Tree-shaken eject: the requested component plus only the local declarations it
 * transitively references — following relative imports of *non-public* symbols
 * into sibling files and inlining them, so a widget split across several files
 * ejects exactly as if it lived in one. Public (@ha*) imports are rewritten to
 * their aliases; nothing changes for a widget whose closure is single-file.
 * Returns { imports, body } or { error }.
 */
function ejectComponent(entryFile, name, symbolIndex, getAnalysis) {
  const byNameCache = new Map();
  const byNameFor = (file) => {
    let m = byNameCache.get(file);
    if (!m) {
      m = new Map();
      for (const d of getAnalysis(file).decls) for (const n of d.names) m.set(n, d);
      byNameCache.set(file, m);
    }
    return m;
  };

  const declFile = new Map(); // decl object → file it is declared in

  // Is `ref` (used inside `file`) a local declaration we should inline? Either
  // declared in `file`, or imported from a sibling via a relative path with no
  // public alias (i.e. a split-out helper, not an @ha export).
  const localDeclFor = (file, ref) => {
    const here = byNameFor(file).get(ref);
    if (here) {
      if (!declFile.has(here)) declFile.set(here, file);
      return here;
    }
    if (symbolIndex.has(ref)) return null; // public symbol → stays an import
    for (const imp of getAnalysis(file).imports) {
      if (!imp.spec.startsWith('.') || imp.hasNamespace) continue;
      if (!imp.valueNames.includes(ref) && !imp.typeNames.includes(ref)) continue;
      const sib = resolveRelativeFile(file, imp.spec);
      if (!sib) continue;
      const sd = byNameFor(sib).get(ref);
      if (sd) {
        if (!declFile.has(sd)) declFile.set(sd, sib);
        return sd;
      }
    }
    return null;
  };

  const root = byNameFor(entryFile).get(name);
  if (!root) return { error: 'declaration not found in file' };
  declFile.set(root, entryFile);

  // transitive closure over local declarations (across inlined sibling files)
  const keep = new Set();
  const stack = [root];
  while (stack.length) {
    const d = stack.pop();
    if (keep.has(d)) continue;
    keep.add(d);
    const file = declFile.get(d);
    for (const ref of d.refs) {
      const dep = localDeclFor(file, ref);
      if (dep && !keep.has(dep)) stack.push(dep);
    }
  }

  // Order: entry-file declarations first (source order), then any sibling file's
  // declarations grouped by path. Identical to the old single-file ordering when
  // nothing was split out.
  const fileRank = (f) => (f === entryFile ? '' : f);
  const kept = [...keep].sort((a, b) => {
    const fa = fileRank(declFile.get(a));
    const fb = fileRank(declFile.get(b));
    if (fa !== fb) return fa < fb ? -1 : 1;
    return a.start - b.start;
  });

  // symbols actually used by the kept declarations
  const used = new Set();
  for (const d of kept) for (const r of d.refs) used.add(r);
  // names now declared locally (inlined) must not be re-imported
  const inlined = new Set();
  for (const d of kept) for (const n of d.names) inlined.add(n);

  // resolve imports → public aliases, restricted to used (non-inlined) symbols
  const valueImports = new Map();
  const typeImports = new Map();
  const addImport = (map, alias, n) => {
    if (!map.has(alias)) map.set(alias, new Set());
    map.get(alias).add(n);
  };
  const filesInvolved = new Set([...kept].map((d) => declFile.get(d)));
  for (const file of filesInvolved) {
    for (const imp of getAnalysis(file).imports) {
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
          if (!used.has(n) || inlined.has(n)) continue;
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
  }

  // assemble body: kept declarations, export keyword removed
  const blocks = kept.map((d) => {
    const text = getAnalysis(declFile.get(d)).text;
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
    const getAnalysis = (f) => {
      if (!analysisCache.has(f)) analysisCache.set(f, analyzeFile(f));
      return analysisCache.get(f);
    };
    const result = ejectComponent(file, name, symbolIndex, getAnalysis);
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
