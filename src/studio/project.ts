// A "project" is your virtual filesystem: many files, one entry point.
export interface Project {
  files: Record<string, string>;
  entry: string;
}

// ── Virtual path helpers (posix-style, no leading slash) ─────────────────────
export function dirname(path: string): string {
  const i = path.lastIndexOf('/');
  return i === -1 ? '' : path.slice(0, i);
}

export function joinPath(base: string, rel: string): string {
  const parts = base ? base.split('/') : [];
  for (const seg of rel.split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') parts.pop();
    else parts.push(seg);
  }
  return parts.join('/');
}

export { DEFAULT_PROJECT } from './defaultProject.generated';

/** Minimal entry used after "delete all", so the Studio stays functional. */
export const BLANK_DASHBOARD = `export default function Dashboard() {
  return (
    <div className="rd-root">
      <h2>Neues Dashboard</h2>
      <p>Lege links Dateien an oder ziehe sie per Drag & Drop herein.</p>
    </div>
  );
}
`;

export const blankProject = (): Project => ({
  entry: 'dashboard.tsx',
  files: { 'dashboard.tsx': BLANK_DASHBOARD },
});

/** Starter content when you add a brand-new file. */
export function newFileTemplate(path: string): string {
  const base = path.split('/').pop()!.replace(/\.(tsx?|jsx?)$/, '');
  const name = base.charAt(0).toUpperCase() + base.slice(1).replace(/[^a-zA-Z0-9]/g, '');
  return `export function ${name || 'Component'}() {
  return <div>${name}</div>;
}
`;
}
