// Shared Sucrase compile check for virtual dashboard projects (CI + sync:pull).

import { transform } from 'sucrase';
import { extractImports, resolveModule } from '../src/studio/moduleResolve.mjs';

// Mirror of the module manifest (src/sdk/modules.ts). Kept in sync by
// tests/sdk-modules.test.ts, which fails if this set drifts from the manifest.
const REGISTRY = new Set([
  'react',
  'react/jsx-runtime',
  '@ha',
  '@ha/ui',
  '@ha/layout',
  '@ha/format',
  '@ha/debug',
]);

function resolve(files, importer, request) {
  const resolved = resolveModule(files, importer, request, (r) => REGISTRY.has(r));
  if (resolved === null) {
    throw new Error(`Unresolved import '${request}' in ${importer}`);
  }
  return resolved;
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
