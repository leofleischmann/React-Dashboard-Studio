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
  /** Component name — used for the region label and dedupe. */
  name: string;
  /** `<Tag … />` inserted at the cursor; props stay easy to tweak. */
  usage: string;
  /** Import statements the definition needs (already public-aliased). */
  imports: string[];
  /** The component source pasted into the folded region. */
  definition: string;
};

export const REGION_PREFIX = '// #region 🧩 ';
export const REGION_SUFFIX = ' (ejected · frei bearbeitbar · kein Auto-Update)';
export const REGION_END = '// #endregion';

/** Build the eject payload for a catalog widget by name. */
export function ejectForWidgetName(
  name: string,
  entityId: string | null,
): EjectInsert | null {
  const entry = WIDGET_CATALOG.find((e) => e.name === name);
  if (!entry) return null;
  const usage = catalogSnippet(entry, entityId);
  const override = catalogSourceOverride(entry, entityId);
  if (override !== null) {
    return { name, usage, imports: [], definition: override };
  }
  const src = EJECT_SOURCES[name];
  if (!src) return null;
  return { name, usage, imports: src.imports, definition: src.body };
}

/** Build the eject payload for the default widget of an entity's domain. */
export function ejectForEntity(entityId: string): EjectInsert | null {
  const domain = entityId.split('.')[0] ?? '';
  return ejectForWidgetName(widgetNameForDomain(domain), entityId);
}

/** Self-contained text block (imports + definition + usage) for clipboard mode. */
export function ejectToText(e: EjectInsert): string {
  return [...e.imports, '', e.definition.trimEnd(), '', e.usage, ''].join('\n');
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

/** Import lines for symbols the document does not already import, grouped by module. */
function missingImportLines(eject: EjectInsert, existing: Set<string>): string {
  const value = new Map<string, Set<string>>();
  const type = new Map<string, Set<string>>();
  for (const line of eject.imports) {
    const m = line.match(/^import\s+(type\s+)?\{([^}]*)\}\s+from\s+'([^']+)'/);
    if (!m) continue;
    const target = m[1] ? type : value;
    const mod = m[3];
    for (let n of m[2].split(',')) {
      n = n.trim().replace(/^type\s+/, '');
      if (!n || existing.has(n)) continue;
      if (!target.has(mod)) target.set(mod, new Set());
      target.get(mod)!.add(n);
    }
  }
  const lines: string[] = [];
  for (const [mod, names] of value) lines.push(`import { ${[...names].sort().join(', ')} } from '${mod}';`);
  for (const [mod, names] of type) lines.push(`import type { ${[...names].sort().join(', ')} } from '${mod}';`);
  return lines.join('\n');
}

export type EjectChange = { from: number; to: number; insert: string };

/**
 * Pure: compute the document edits for an eject insertion at selection [from,to].
 * Returns the change set plus the resulting cursor position (after the usage).
 */
export function computeEjectChanges(
  doc: string,
  from: number,
  to: number,
  eject: EjectInsert,
): { changes: EjectChange[]; selection: number } {
  const changes: EjectChange[] = [];

  const missing = missingImportLines(eject, existingImportedNames(doc));
  const importPos = lastImportEnd(doc);
  let importInsert = '';
  if (missing) importInsert = importPos > 0 ? `\n${missing}` : `${missing}\n`;
  if (importInsert) changes.push({ from: importPos, to: importPos, insert: importInsert });

  // usage replaces the current selection at the cursor
  changes.push({ from, to, insert: eject.usage });

  // definition region — skip if this widget is already ejected in the file
  const regionKey = REGION_PREFIX + eject.name + REGION_SUFFIX;
  if (!doc.includes(regionKey)) {
    const block = `\n\n${regionKey}\n${eject.definition.trimEnd()}\n${REGION_END}\n`;
    changes.push({ from: doc.length, to: doc.length, insert: block });
  }

  const shift = importInsert && importPos <= from ? importInsert.length : 0;
  const selection = from + shift + eject.usage.length;
  return { changes, selection };
}
