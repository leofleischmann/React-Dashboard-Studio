import type { ComponentType } from 'react';
import { transform } from 'sucrase';
import { registry } from '../sdk/runtime';
import type { Project } from './project';
import { extractImports, resolveModule } from './moduleResolve';

interface ModuleEntry {
  exports: Record<string, unknown>;
  deps: string[];
  source: string;
}

interface TranspileEntry {
  source: string;
  code: string;
}

/** Persistent caches survive across debounced recompiles. */
const transpileCache = new Map<string, TranspileEntry>();
const moduleCache = new Map<string, ModuleEntry>();
/** path -> set of modules that import it (directly). */
const dependents = new Map<string, Set<string>>();

function resolve(files: Record<string, string>, importer: string, request: string): string {
  const resolved = resolveModule(files, importer, request, (r) => r in registry);
  if (resolved === null) {
    throw new Error(
      `Datei nicht gefunden: '${request}' (importiert in ${importer})`,
    );
  }
  return resolved;
}

function transpile(path: string, source: string): string {
  const cached = transpileCache.get(path);
  if (cached && cached.source === source) return cached.code;

  const code = transform(source, {
    transforms: ['typescript', 'jsx', 'imports'],
    jsxRuntime: 'automatic',
    production: true,
    filePath: path,
  }).code;

  transpileCache.set(path, { source, code });
  return code;
}

function invalidateModule(path: string): void {
  moduleCache.delete(path);
  transpileCache.delete(path);
  const deps = dependents.get(path);
  if (deps) {
    for (const dependent of deps) invalidateModule(dependent);
    dependents.delete(path);
  }
}

function clearDependentsOf(importer: string): void {
  for (const set of dependents.values()) {
    set.delete(importer);
  }
}

function registerDependency(importer: string, imported: string): void {
  if (imported in registry) return;
  let set = dependents.get(imported);
  if (!set) {
    set = new Set();
    dependents.set(imported, set);
  }
  set.add(importer);
}

/**
 * Compile a whole project (virtual filesystem) into a live component — in the
 * browser, no bundler. Each file is transpiled by Sucrase; `import`s resolve
 * against the built-in registry (@ha, react, …) OR against your other files.
 *
 * Pass a file path to incrementally invalidate only that file and its
 * dependents; pass `'all'` for a full rebuild; omit the argument to reuse caches.
 */
export function compileProject(
  project: Project,
  invalidate?: string | 'all',
): ComponentType {
  const { files, entry } = project;

  if (invalidate === 'all') {
    transpileCache.clear();
    moduleCache.clear();
    dependents.clear();
  } else if (invalidate) {
    invalidateModule(invalidate);
  }

  function load(path: string): Record<string, unknown> {
    const source = files[path];
    if (source === undefined) {
      throw new Error(`Datei nicht gefunden: '${path}'`);
    }

    const cached = moduleCache.get(path);
    if (cached && cached.source === source) return cached.exports;

    clearDependentsOf(path);

    const compiled = transpile(path, source);
    const module = { exports: {} as Record<string, unknown> };
    const deps: string[] = [];

    const requireFn = (request: string): unknown => {
      if (request in registry) return registry[request];
      const resolved = resolve(files, path, request);
      deps.push(resolved);
      registerDependency(path, resolved);
      return load(resolved);
    };

    try {
      // eslint-disable-next-line no-new-func -- runs YOUR own code on YOUR own instance
      new Function('require', 'module', 'exports', compiled)(
        requireFn,
        module,
        module.exports,
      );
    } catch (err) {
      throw new Error(`${path}: ${(err as Error).message}`);
    }

    // Static import scan for dependency tracking (covers unused imports too).
    for (const request of extractImports(source)) {
      if (request in registry) continue;
      try {
        const resolved = resolve(files, path, request);
        deps.push(resolved);
        registerDependency(path, resolved);
      } catch {
        // unresolved imports surface when the module is actually required
      }
    }

    moduleCache.set(path, { exports: module.exports, deps, source });
    return module.exports;
  }

  if (!(entry in files)) {
    throw new Error(`Einstiegsdatei "${entry}" existiert nicht.`);
  }

  const exports = load(entry);
  const Component = (exports.default ?? exports) as unknown;
  if (typeof Component !== 'function') {
    throw new Error(
      `Die Einstiegsdatei "${entry}" braucht eine Komponente als \`export default\`.`,
    );
  }
  return Component as ComponentType;
}

/** Drop all compile caches (e.g. when switching projects). */
export function clearCompileCache(): void {
  transpileCache.clear();
  moduleCache.clear();
  dependents.clear();
}
