import { describe, it, expect, beforeEach, vi } from 'vitest';

// compile.ts only needs the registry to know which import specifiers are
// "external" (resolved to a module) vs. project files. Stub it so these tests
// stay in the node env and don't pull the whole React SDK in.
vi.mock('../src/sdk/runtime', () => ({
  registry: {
    react: { MARKER: 'react-ns' },
    'react/jsx-runtime': {},
  },
}));

import { compileProject, clearCompileCache } from '../src/studio/compile';

type Files = Record<string, string>;
const project = (files: Files, entry = 'index.tsx') => ({ files, entry });
const run = (c: unknown) => (c as () => unknown)();

beforeEach(() => clearCompileCache());

describe('compileProject', () => {
  it('compiles an entry with a default component export', () => {
    const C = compileProject(project({ 'index.tsx': 'export default () => 42;' }));
    expect(typeof C).toBe('function');
    expect(run(C)).toBe(42);
  });

  it('resolves relative imports to other project files', () => {
    const C = compileProject(
      project({
        'index.tsx': "import { v } from './util'; export default () => v;",
        'util.ts': 'export const v = 7;',
      }),
    );
    expect(run(C)).toBe(7);
  });

  it('resolves directory imports via /index', () => {
    const C = compileProject(
      project({
        'index.tsx': "import { v } from './lib'; export default () => v;",
        'lib/index.ts': 'export const v = 9;',
      }),
    );
    expect(run(C)).toBe(9);
  });

  it('resolves registry (external) imports to the registry module', () => {
    const C = compileProject(
      project({
        'index.tsx':
          "import * as React from 'react'; export default () => (React as any).MARKER;",
      }),
    );
    expect(run(C)).toBe('react-ns');
  });

  it('throws when the entry file is missing', () => {
    expect(() =>
      compileProject(project({ 'a.tsx': 'export default () => 1;' }, 'index.tsx')),
    ).toThrow(/Einstiegsdatei "index\.tsx" existiert nicht/);
  });

  it('throws when the entry has no default component', () => {
    expect(() =>
      compileProject(project({ 'index.tsx': 'export const x = 1;' })),
    ).toThrow(/export default/);
  });

  it('throws a located error for an unresolved import', () => {
    expect(() =>
      compileProject(
        project({ 'index.tsx': "import x from './missing'; export default () => x;" }),
      ),
    ).toThrow(/Datei nicht gefunden/);
  });

  it('incrementally invalidates a changed dependency and its importers', () => {
    const v1 = {
      'index.tsx': "import { v } from './b'; export default () => v;",
      'b.ts': 'export const v = 1;',
    };
    expect(run(compileProject(project(v1)))).toBe(1);

    const v2 = { ...v1, 'b.ts': 'export const v = 2;' };
    // Without invalidating, the cached importer is reused (documented contract).
    expect(run(compileProject(project(v2)))).toBe(1);
    // Invalidating the changed file cascades to its dependents.
    expect(run(compileProject(project(v2), 'b.ts'))).toBe(2);
  });

  it("rebuilds everything on invalidate 'all'", () => {
    const v1 = { 'index.tsx': 'export default () => 1;' };
    expect(run(compileProject(project(v1)))).toBe(1);
    const v2 = { 'index.tsx': 'export default () => 2;' };
    expect(run(compileProject(project(v2), 'all'))).toBe(2);
  });

  it('clearCompileCache drops caches so the next build is fresh', () => {
    const v1 = {
      'index.tsx': "import { v } from './b'; export default () => v;",
      'b.ts': 'export const v = 1;',
    };
    expect(run(compileProject(project(v1)))).toBe(1);
    clearCompileCache();
    const v2 = { ...v1, 'b.ts': 'export const v = 2;' };
    expect(run(compileProject(project(v2)))).toBe(2);
  });
});
