// Folding for `// #region … // #endregion` blocks, so ejected widget sources
// collapse to a single line and don't clutter the user's own code.

import { codeFolding, foldEffect, foldGutter, foldService } from '@codemirror/language';
import type { EditorState } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';

const REGION_RE = /^\s*\/\/\s*#region\b/;
const ENDREGION_RE = /^\s*\/\/\s*#endregion\b/;

/** Fold range for a `#region` that starts on the given line, else null. */
function regionRangeAt(state: EditorState, lineNumber: number) {
  const start = state.doc.line(lineNumber);
  if (!REGION_RE.test(start.text)) return null;
  let depth = 1;
  for (let n = lineNumber + 1; n <= state.doc.lines; n++) {
    const line = state.doc.line(n);
    if (REGION_RE.test(line.text)) depth++;
    else if (ENDREGION_RE.test(line.text) && --depth === 0) {
      return { from: start.to, to: line.to };
    }
  }
  return null;
}

const regionFoldService = foldService.of((state, lineStart) =>
  regionRangeAt(state, state.doc.lineAt(lineStart).number),
);

/** Drop-in editor extension: region folding + a fold gutter. */
export const regionFolding = [codeFolding(), foldGutter(), regionFoldService];

/** Collapse every `#region` block in the document (used on load & after eject). */
export function foldAllRegions(view: EditorView) {
  const effects = [];
  const { state } = view;
  for (let n = 1; n <= state.doc.lines; n++) {
    if (!REGION_RE.test(state.doc.line(n).text)) continue;
    const range = regionRangeAt(state, n);
    if (range && range.from < range.to) effects.push(foldEffect.of(range));
  }
  if (effects.length) view.dispatch({ effects });
}
