// Shared Sucrase compile check for virtual dashboard projects (CI + sync:pull).

import { transform } from 'sucrase';

const REGISTRY = new Set([
  'react',
  'react/jsx-runtime',
  '@ha',
  '@ha/ui',
  '@ha/layout',
  '@ha/format',
  '@ha/debug',
]);

const RESOLVE_EXTS = ['', '.tsx', '.ts', '.jsx', '.js', '/index.tsx', '/index.ts'];

function dirname(path) {
  const i = path.lastIndexOf('/');
  return i === -1 ? '' : path.slice(0, i);
}

function joinPath(base, rel) {
  const parts = base ? base.split('/') : [];
  for (const seg of rel.split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') parts.pop();
    else parts.push(seg);
  }
  return parts.join('/');
}

function resolve(files, importer, request) {
  if (REGISTRY.has(request)) return request;
  const base = request.startsWith('.')
    ? joinPath(dirname(importer), request)
    : request;
  for (const ext of RESOLVE_EXTS) {
    if (base + ext in files) return base + ext;
  }
  throw new Error(`Unresolved import '${request}' in ${importer}`);
}

function extractImports(source) {
  const re = /(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g;
  const out = [];
  let m;
  while ((m = re.exec(source)) !== null) out.push(m[1]);
  return out;
}

/**
 * @param {{ files: Record<string, string>; entry: string; label?: string }} project
 * @throws if transpile or import resolution fails
 */
export function validateDashboardProject({ files, entry, label = 'dashboard' }) {
  if (!files || Object.keys(files).length === 0) {
    throw new Error(`${label}: keine Dateien.`);
  }
  if (!entry || !(entry in files)) {
    throw new Error(`${label}: Einstiegsdatei "${entry}" fehlt.`);
  }

  let count = 0;
  for (const [path, source] of Object.entries(files)) {
    transform(source, {
      transforms: ['typescript', 'jsx', 'imports'],
      jsxRuntime: 'automatic',
      production: true,
      filePath: path,
    });
    for (const request of extractImports(source)) resolve(files, path, request);
    count++;
  }

  const entrySource = files[entry];
  transform(entrySource, {
    transforms: ['typescript', 'jsx', 'imports'],
    jsxRuntime: 'automatic',
    production: true,
    filePath: entry,
  });
  if (!/export\s+default/.test(entrySource)) {
    throw new Error(`${label}: "${entry}" braucht export default.`);
  }

  return { count, entry, label };
}
