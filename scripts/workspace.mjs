/** Shared workspace model for local sync + HA global storage. */

export const WORKSPACE_VERSION = 2;
export const DEFAULT_PROJECT_ID = 'default';
export const PROJECT_SLUG_RE = /^[a-z][a-z0-9_-]{0,31}$/;

export function isProjectSlug(id) {
  return typeof id === 'string' && PROJECT_SLUG_RE.test(id);
}

export function slugFromName(name) {
  let s = String(name ?? '')
    .trim()
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!s) s = 'dashboard';
  if (!/^[a-z]/.test(s)) s = `d-${s}`;
  return s.slice(0, 32);
}

export function uniqueSlug(base, existing) {
  const taken = new Set(existing);
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

export function normalizeProject(data) {
  if (!data) return null;
  const files = data.files;
  const entry = data.entry;
  if (!files || typeof entry !== 'string' || !entry) return null;
  if (!Object.keys(files).length || !(entry in files)) return null;
  return { files, entry };
}

export function normalizeWorkspace(data) {
  if (!data || data.version !== WORKSPACE_VERSION) return null;
  const projects = {};
  for (const [id, raw] of Object.entries(data.projects ?? {})) {
    if (!isProjectSlug(id)) continue;
    const core = normalizeProject(raw);
    if (!core) continue;
    const name =
      typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : id;
    projects[id] = { name, ...core };
  }
  if (!Object.keys(projects).length) return null;
  const activeId =
    isProjectSlug(data.activeId) && projects[data.activeId]
      ? data.activeId
      : Object.keys(projects).sort()[0];
  return { version: WORKSPACE_VERSION, activeId, projects };
}

export function workspaceMeta(workspace) {
  return {
    version: WORKSPACE_VERSION,
    active: workspace.activeId,
    projects: Object.fromEntries(
      Object.entries(workspace.projects).map(([id, p]) => [
        id,
        { name: p.name, entry: p.entry },
      ]),
    ),
  };
}
