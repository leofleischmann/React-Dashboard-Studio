// Module resolution for the virtual dashboard "project" (a flat map of file
// path -> source). Shared by the in-browser compiler (src/studio/compile.ts)
// and the Node-side compile check (scripts/compile-check.mjs) so the resolution
// algorithm lives in exactly one place. Plain JS so the .mjs script can import
// it directly; types come from the sibling moduleResolve.d.ts.

export const RESOLVE_EXTS = ['', '.tsx', '.ts', '.jsx', '.js', '/index.tsx', '/index.ts'];

/** posix-style dirname, no leading slash. */
export function dirname(path) {
  const i = path.lastIndexOf('/');
  return i === -1 ? '' : path.slice(0, i);
}

/** Join `rel` onto `base`, collapsing `.`/`..` segments. */
export function joinPath(base, rel) {
  const parts = base ? base.split('/') : [];
  for (const seg of rel.split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') parts.pop();
    else parts.push(seg);
  }
  return parts.join('/');
}

/** Every `import`/`export ... from '...'` specifier in source order. */
export function extractImports(source) {
  const re = /(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g;
  const out = [];
  let m;
  while ((m = re.exec(source)) !== null) out.push(m[1]);
  return out;
}

/**
 * Resolve `request` (imported from `importer`) to a key in `files`, or return
 * the request unchanged when `isExternal(request)` (a registry/standard module).
 * Returns `null` when a relative/local import cannot be found — callers throw
 * their own (context-specific) error message.
 */
export function resolveModule(files, importer, request, isExternal) {
  if (isExternal(request)) return request;
  const base = request.startsWith('.')
    ? joinPath(dirname(importer), request)
    : request;
  for (const ext of RESOLVE_EXTS) {
    if (base + ext in files) return base + ext;
  }
  return null;
}
