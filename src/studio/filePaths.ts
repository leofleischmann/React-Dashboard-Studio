// Pure path helpers for the file panel (virtual project paths, posix-style).

export function normalize(input: string): string {
  let p = input.trim().replace(/^\/+/, '');
  if (!/\.(tsx?|jsx?)$/.test(p)) p += '.tsx';
  return p;
}

export const basename = (p: string): string => p.split('/').pop() ?? p;

export const folderPrefix = (dir: string): string => `${dir}/`;

export function pathsInFolder(files: Record<string, string>, dirPath: string): string[] {
  const prefix = folderPrefix(dirPath);
  return Object.keys(files).filter((p) => p.startsWith(prefix));
}

export function remapDirPath(path: string, oldDir: string, newDir: string): string {
  const prefix = folderPrefix(oldDir);
  if (path === oldDir || path.startsWith(prefix)) {
    return newDir + path.slice(oldDir.length);
  }
  return path;
}
