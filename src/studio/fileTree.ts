// Builds a sorted folder tree from a flat list of virtual file paths.

export type FileNode = { kind: 'file'; name: string; path: string };
export type DirNode = { kind: 'dir'; name: string; path: string; children: TreeNode[] };
export type TreeNode = FileNode | DirNode;

export function buildTree(paths: string[]): TreeNode[] {
  const root: TreeNode[] = [];
  const dirs = new Map<string, DirNode>();
  for (const full of paths) {
    const segs = full.split('/');
    let level = root;
    let prefix = '';
    for (let i = 0; i < segs.length; i++) {
      const seg = segs[i];
      prefix = prefix ? `${prefix}/${seg}` : seg;
      if (i === segs.length - 1) {
        level.push({ kind: 'file', name: seg, path: full });
      } else {
        let dir = dirs.get(prefix);
        if (!dir) {
          dir = { kind: 'dir', name: seg, path: prefix, children: [] };
          dirs.set(prefix, dir);
          level.push(dir);
        }
        level = dir.children;
      }
    }
  }
  const sort = (nodes: TreeNode[]) => {
    nodes.sort((a, b) =>
      a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === 'dir' ? -1 : 1,
    );
    for (const n of nodes) if (n.kind === 'dir') sort(n.children);
  };
  sort(root);
  return root;
}
