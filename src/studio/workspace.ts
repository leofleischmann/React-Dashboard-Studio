import type { Project } from './project';

export const WORKSPACE_VERSION = 2 as const;
export const DEFAULT_PROJECT_ID = 'default';
export const PROJECT_SLUG_RE = /^[a-z][a-z0-9_-]{0,31}$/;

export type DashboardProject = Project & {
  /** Display name (Home, Kino, …). */
  name: string;
};

export type Workspace = {
  version: typeof WORKSPACE_VERSION;
  activeId: string;
  projects: Record<string, DashboardProject>;
};

export function isProjectSlug(id: string): boolean {
  return PROJECT_SLUG_RE.test(id);
}

export function slugFromName(name: string): string {
  let s = name
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

export function uniqueSlug(base: string, existing: Iterable<string>): string {
  const taken = new Set(existing);
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

function normalizeProject(data: unknown): Project | null {
  if (!data || typeof data !== 'object') return null;
  const o = data as Project;
  if (!o.files || !o.entry || !Object.keys(o.files).length) return null;
  if (!(o.entry in o.files)) return null;
  return { files: o.files, entry: o.entry };
}

export function normalizeWorkspace(data: unknown): Workspace | null {
  if (!data || typeof data !== 'object') return null;
  const raw = data as Partial<Workspace>;
  if (raw.version !== WORKSPACE_VERSION) return null;

  const projects: Record<string, DashboardProject> = {};
  for (const [id, p] of Object.entries(raw.projects ?? {})) {
    if (!isProjectSlug(id)) continue;
    const core = normalizeProject(p);
    if (!core) continue;
    const name =
      p && typeof p === 'object' && 'name' in p && typeof p.name === 'string' && p.name.trim()
        ? p.name.trim()
        : id;
    projects[id] = { name, ...core };
  }
  if (!Object.keys(projects).length) return null;

  const activeId =
    raw.activeId && isProjectSlug(raw.activeId) && projects[raw.activeId]
      ? raw.activeId
      : Object.keys(projects).sort()[0];

  return { version: WORKSPACE_VERSION, activeId, projects };
}

export function projectFromWorkspace(
  workspace: Workspace,
  activeId = workspace.activeId,
): Project | null {
  const p = workspace.projects[activeId];
  if (!p) return null;
  return { files: p.files, entry: p.entry };
}

export function withActiveProject(
  workspace: Workspace,
  activeId: string,
  project: Project,
): Workspace {
  const prev = workspace.projects[activeId];
  return {
    ...workspace,
    activeId,
    projects: {
      ...workspace.projects,
      [activeId]: {
        name: prev?.name ?? activeId,
        files: project.files,
        entry: project.entry,
      },
    },
  };
}

export function createWorkspaceProject(
  workspace: Workspace,
  name: string,
  template: Project,
): { workspace: Workspace; id: string } {
  const base = slugFromName(name);
  const id = uniqueSlug(base, Object.keys(workspace.projects));
  return {
    id,
    workspace: {
      version: WORKSPACE_VERSION,
      activeId: id,
      projects: {
        ...workspace.projects,
        [id]: { name: name.trim() || id, ...template },
      },
    },
  };
}

export function renameWorkspaceProject(
  workspace: Workspace,
  id: string,
  name: string,
): Workspace {
  const p = workspace.projects[id];
  if (!p) return workspace;
  return {
    ...workspace,
    projects: {
      ...workspace.projects,
      [id]: { ...p, name: name.trim() || id },
    },
  };
}

export function deleteWorkspaceProject(workspace: Workspace, id: string): Workspace | null {
  const ids = Object.keys(workspace.projects);
  if (ids.length <= 1) return null;
  const { [id]: _removed, ...rest } = workspace.projects;
  const activeId =
    workspace.activeId === id
      ? Object.keys(rest).sort()[0]
      : workspace.activeId;
  return { version: WORKSPACE_VERSION, activeId, projects: rest };
}
