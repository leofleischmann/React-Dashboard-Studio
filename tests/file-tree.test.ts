import { describe, it, expect } from 'vitest';
import {
  basename,
  normalize,
  pathsInFolder,
  remapDirPath,
} from '../src/studio/filePaths';
import { buildTree } from '../src/studio/fileTree';

describe('filePaths', () => {
  it('normalize strips leading slashes and defaults the extension to .tsx', () => {
    expect(normalize('  /components/Card  ')).toBe('components/Card.tsx');
    expect(normalize('util.ts')).toBe('util.ts');
    expect(normalize('a.js')).toBe('a.js');
  });

  it('basename returns the last path segment', () => {
    expect(basename('a/b/c.tsx')).toBe('c.tsx');
    expect(basename('x.tsx')).toBe('x.tsx');
  });

  it('pathsInFolder returns only paths under the folder', () => {
    const files = { 'a.tsx': '', 'lib/x.ts': '', 'lib/y.ts': '', 'libx/z.ts': '' };
    expect(pathsInFolder(files, 'lib').sort()).toEqual(['lib/x.ts', 'lib/y.ts']);
  });

  it('remapDirPath moves the folder and its descendants only', () => {
    expect(remapDirPath('lib/x.ts', 'lib', 'src')).toBe('src/x.ts');
    expect(remapDirPath('lib', 'lib', 'src')).toBe('src');
    expect(remapDirPath('other/x.ts', 'lib', 'src')).toBe('other/x.ts');
  });
});

describe('buildTree', () => {
  it('groups files into folders, dirs before files, alphabetical', () => {
    const tree = buildTree(['z.tsx', 'lib/b.ts', 'lib/a.ts', 'dashboard.tsx']);
    expect(tree.map((n) => `${n.kind}:${n.name}`)).toEqual([
      'dir:lib',
      'file:dashboard.tsx',
      'file:z.tsx',
    ]);
    const lib = tree[0];
    expect(lib.kind === 'dir' && lib.children.map((c) => c.name)).toEqual(['a.ts', 'b.ts']);
  });

  it('builds nested directories', () => {
    const tree = buildTree(['a/b/c.tsx']);
    expect(tree[0]).toMatchObject({ kind: 'dir', name: 'a', path: 'a' });
  });
});
