// Eject-only insertion: picking a widget copies its real source into the user's
// dashboard (folded #region block, deduped), drops a `<Tag … />` at the cursor
// and merges the needed imports. No black-box import, so nothing the SDK later
// changes or removes can ever break an already-inserted widget.

import {
  WIDGET_CATALOG,
  catalogSnippet,
  catalogSourceOverride,
  widgetNameForDomain,
} from '../sdk/ui/catalog';
import { EJECT_SOURCES } from '../sdk/ui/catalog/eject.generated';

export type EjectInsert = {
  /** Primary component name — used for the usage tag. */
  name: string;
  /** `<Tag … />` inserted at the cursor; props stay easy to tweak. */
  usage: string;
  /** Import statements the definitions need (already public-aliased). */
  imports: string[];
  /**
   * Component sources to paste — the picked widget plus any nested catalog
   * widgets it uses (cascade), each in its own folded region and deduped.
   */
  definitions: { name: string; body: string }[];
};

function parseImportLine(
  line: string,
): { isType: boolean; module: string; names: string[] } | null {
  const m = line.match(/^import\s+(type\s+)?\{([^}]*)\}\s+from\s+'([^']+)'/);
  if (!m) return null;
  const names = m[2]
    .split(',')
    .map((s) => s.trim().replace(/^type\s+/, ''))
    .filter(Boolean);
  return { isType: Boolean(m[1]), module: m[3], names };
}

export const REGION_PREFIX = '// #region 🧩 ';
export const REGION_SUFFIX = ' (ejected · frei bearbeitbar · kein Auto-Update)';
export const REGION_END = '// #endregion';

/**
 * Build the eject payload for a catalog widget, cascading into any nested
 * catalog widgets it imports: those are ejected as their own regions and their
 * `@ha/ui` import is dropped, so the result has no black-box widget imports.
 */
export function ejectForWidgetName(
  name: string,
  entityId: string | null,
): EjectInsert | null {
  const entry = WIDGET_CATALOG.find((e) => e.name === name);
  if (!entry) return null;
  const usage = catalogSnippet(entry, entityId);

  const definitions: { name: string; body: string }[] = [];
  const imports: string[] = [];
  const visited = new Set<string>();

  const collect = (widget: string, isRoot: boolean) => {
    if (visited.has(widget)) return;
    visited.add(widget);

    if (isRoot) {
      const override = catalogSourceOverride(entry, entityId);
      if (override !== null) {
        definitions.push({ name: widget, body: override });
        return;
      }
    }
    const src = EJECT_SOURCES[widget];
    if (!src) return;
    definitions.push({ name: widget, body: src.body });

    for (const line of src.imports) {
      const parsed = parseImportLine(line);
      if (!parsed) {
        imports.push(line);
        continue;
      }
      const keep = parsed.names.filter((n) => {
        if (EJECT_SOURCES[n] && n !== widget) {
          collect(n, false); // nested catalog widget → eject instead of import
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
  collect(name, true);

  if (definitions.length === 0) return null;
  return { name, usage, imports, definitions };
}

/** Build the eject payload for the default widget of an entity's domain. */
export function ejectForEntity(entityId: string): EjectInsert | null {
  const domain = entityId.split('.')[0] ?? '';
  return ejectForWidgetName(widgetNameForDomain(domain), entityId);
}

/** Self-contained text block (imports + definitions + usage) for clipboard mode. */
export function ejectToText(e: EjectInsert): string {
  const defs = e.definitions.map((d) => d.body.trimEnd()).join('\n\n');
  return [...e.imports, '', defs, '', e.usage, ''].join('\n');
}

/** Binding names already imported anywhere in the document. */
function existingImportedNames(doc: string): Set<string> {
  const names = new Set<string>();
  const re = /import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+['"][^'"]+['"]/g;
  let m: RegExpExecArray | null;
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

/** Offset just after the last top-level import statement (0 if none). */
function lastImportEnd(doc: string): number {
  const re = /^import\b[\s\S]*?from\s+['"][^'"]+['"];?/gm;
  let end = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(doc))) end = m.index + m[0].length;
  return end;
}

const parseNames = (inner: string): string[] =>
  inner.split(',').map((s) => s.trim().replace(/^type\s+/, '')).filter(Boolean);

const addTo = (map: Map<string, Set<string>>, key: string, val: string) => {
  if (!map.has(key)) map.set(key, new Set());
  map.get(key)!.add(val);
};

/** Group import lines into value/type maps by module. */
function importsByModule(lines: string[]) {
  const value = new Map<string, Set<string>>();
  const type = new Map<string, Set<string>>();
  for (const line of lines) {
    const p = parseImportLine(line);
    if (!p) continue;
    for (const n of p.names) addTo(p.isType ? type : value, p.module, n);
  }
  return { value, type };
}

/**
 * Add missing imports, merging names into an existing same-module import (brace
 * insertion, preserving multi-line style) instead of appending separate lines.
 */
function addMissingImports(
  doc: string,
  value: Map<string, Set<string>>,
  type: Map<string, Set<string>>,
): string {
  const existing = existingImportedNames(doc);
  const stmts: { isType: boolean; module: string; namesStart: number; namesEnd: number }[] = [];
  for (const m of doc.matchAll(/import\s+(type\s+)?\{([^}]*)\}\s+from\s+'([^']+)';?/g)) {
    const idx = m.index ?? 0;
    stmts.push({
      isType: Boolean(m[1]),
      module: m[3],
      namesStart: idx + m[0].indexOf('{') + 1,
      namesEnd: idx + m[0].lastIndexOf('}'),
    });
  }
  const edits: { start: number; end: number; replacement: string }[] = [];
  const newLines: string[] = [];
  const handle = (byMod: Map<string, Set<string>>, isType: boolean) => {
    for (const [mod, names] of byMod) {
      const missing = [...names].filter((n) => !existing.has(n));
      if (missing.length === 0) continue;
      missing.forEach((n) => existing.add(n));
      const stmt = stmts.find((s) => s.module === mod && s.isType === isType);
      if (!stmt) {
        newLines.push(`import ${isType ? 'type ' : ''}{ ${missing.sort().join(', ')} } from '${mod}';`);
        continue;
      }
      const inner = doc.slice(stmt.namesStart, stmt.namesEnd);
      if (inner.includes('\n')) {
        const indent = inner.match(/\n([ \t]+)\S/)?.[1] ?? '  ';
        const trimmed = inner.replace(/\s*$/, '');
        const comma = trimmed.endsWith(',') ? '' : ',';
        edits.push({
          start: stmt.namesStart,
          end: stmt.namesEnd,
          replacement: `${trimmed}${comma}\n${missing.map((n) => indent + n + ',').join('\n')}\n`,
        });
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
  handle(value, false);
  handle(type, true);

  let out = doc;
  for (const e of edits.sort((a, b) => b.start - a.start)) {
    out = out.slice(0, e.start) + e.replacement + out.slice(e.end);
  }
  if (newLines.length) {
    const pos = lastImportEnd(out);
    out = out.slice(0, pos) + '\n' + newLines.join('\n') + out.slice(pos);
  }
  return out;
}

export type EjectChange = { from: number; to: number; insert: string };

/**
 * Compute a single full-document replacement for an eject insertion: imports
 * merged into existing module lines, `<Tag/>` at the cursor, definitions appended
 * as folded regions (deduped). Returns the change + new cursor position.
 */
export function computeEjectChanges(
  doc: string,
  from: number,
  to: number,
  eject: EjectInsert,
): { changes: EjectChange[]; selection: number } {
  const { value, type } = importsByModule(eject.imports);
  const merged = addMissingImports(doc, value, type);
  const delta = merged.length - doc.length;

  const cursor = from + delta;
  let out = merged.slice(0, cursor) + eject.usage + merged.slice(to + delta);

  for (const def of eject.definitions) {
    const key = REGION_PREFIX + def.name + REGION_SUFFIX;
    if (out.includes(key)) continue;
    out = out.replace(/\s*$/, '\n') + `\n${key}\n${def.body.trimEnd()}\n${REGION_END}\n`;
  }

  return {
    changes: [{ from: 0, to: doc.length, insert: out }],
    selection: cursor + eject.usage.length,
  };
}

/** Nested catalog widgets a widget's source imports. */
function nestedWidgetsOf(name: string): string[] {
  const out: string[] = [];
  for (const line of EJECT_SOURCES[name].imports) {
    const p = parseImportLine(line);
    if (!p) continue;
    for (const n of p.names) if (EJECT_SOURCES[n] && n !== name) out.push(n);
  }
  return out;
}

function ejectClosure(seeds: string[]): Set<string> {
  const S = new Set<string>();
  const stack = [...seeds];
  while (stack.length) {
    const w = stack.pop()!;
    if (S.has(w) || !EJECT_SOURCES[w]) continue;
    S.add(w);
    for (const n of nestedWidgetsOf(w)) if (!S.has(n)) stack.push(n);
  }
  return S;
}

/** Catalog-widget names imported from `@ha/ui` in this file. */
export function ejectableWidgetsInText(text: string): string[] {
  const set = new Set<string>();
  for (const m of text.matchAll(/import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+'@ha\/ui';?/g)) {
    for (const n of parseNames(m[1])) if (EJECT_SOURCES[n]) set.add(n);
  }
  return [...set];
}

function stripHaUiNames(text: string, remove: Set<string>): string {
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

/**
 * Freeze a whole file: rewrite every `@ha/ui` widget import into an ejected
 * #region (full cascade), merging the needed imports. Returns null if the file
 * has no ejectable `@ha/ui` widgets.
 */
export function freezeImports(text: string): { text: string; ejected: string[] } | null {
  const imported = ejectableWidgetsInText(text);
  if (imported.length === 0) return null;
  const S = ejectClosure(imported);

  const value = new Map<string, Set<string>>();
  const type = new Map<string, Set<string>>();
  for (const w of S) {
    for (const line of EJECT_SOURCES[w].imports) {
      const p = parseImportLine(line);
      if (!p) continue;
      for (const n of p.names) {
        if (EJECT_SOURCES[n]) {
          if (!S.has(n)) addTo(value, '@ha/ui', n);
        } else {
          addTo(p.isType ? type : value, p.module, n);
        }
      }
    }
  }

  let out = stripHaUiNames(text, S);
  out = addMissingImports(out, value, type);

  let regions = '';
  for (const w of S) {
    const key = REGION_PREFIX + w + REGION_SUFFIX;
    if (out.includes(key)) continue;
    regions += `\n\n${key}\n${EJECT_SOURCES[w].body.trimEnd()}\n${REGION_END}\n`;
  }
  out = out.replace(/\s*$/, '\n') + regions;
  return { text: out.replace(/\n{3,}/g, '\n\n'), ejected: [...S] };
}
