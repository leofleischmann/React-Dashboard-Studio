// Shared helpers for the local ./dashboard/ workspace (sync + Vite dev server).

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_DASHBOARD_DIR,
  ENTRY_DEFAULT,
  PERSONAL_DASHBOARD_DIR,
  isDashboardCodeFile,
  listProjectFiles,
} from './project-files.mjs';
import {
  DEFAULT_PROJECT_ID,
  isProjectSlug,
  migrateToWorkspace,
  normalizeWorkspace,
  workspaceMeta,
} from './workspace.mjs';

export { ENTRY_DEFAULT, isDashboardCodeFile } from './project-files.mjs';
export { isProjectSlug, slugFromName, uniqueSlug } from './workspace.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Active dev project: personal dashboard/ or default-dashboard/ via VITE_DEV_PROJECT. */
export const DASHBOARD_DIR =
  process.env.VITE_DEV_PROJECT === 'default-dashboard'
    ? DEFAULT_DASHBOARD_DIR
    : PERSONAL_DASHBOARD_DIR;

export const META_FILE = join(DASHBOARD_DIR, '.studio.json');

function readMetaRaw() {
  if (!existsSync(META_FILE)) return null;
  try {
    return JSON.parse(readFileSync(META_FILE, 'utf8'));
  } catch {
    return null;
  }
}

function pruneProjectOrphans(projectDir, keepPaths) {
  const keep = new Set(keepPaths);
  if (!existsSync(projectDir)) return [];

  const removed = [];

  function walk(dir, base) {
    for (const name of readdirSync(dir)) {
      if (name.startsWith('.')) continue;
      const full = join(dir, name);
      if (statSync(full).isDirectory()) {
        walk(full, base);
        if (readdirSync(full).length === 0) rmSync(full, { recursive: true });
        continue;
      }
      const rel = relative(base, full).split(sep).join('/');
      if (!isDashboardCodeFile(name)) continue;
      if (keep.has(rel)) continue;
      unlinkSync(full);
      removed.push(rel);
    }
  }

  walk(projectDir, projectDir);
  return removed;
}

/** @deprecated flat layout — use readLocalWorkspace */
export function listLocalFiles(dir = DASHBOARD_DIR) {
  const ws = readLocalWorkspace();
  if (!ws) return listProjectFiles(dir);
  const active = ws.projects[ws.activeId];
  return active?.files ?? {};
}

/** @deprecated */
export function readEntry() {
  const ws = readLocalWorkspace();
  if (!ws) return ENTRY_DEFAULT;
  return ws.projects[ws.activeId]?.entry ?? ENTRY_DEFAULT;
}

/** @deprecated */
export function writeEntry(entry) {
  const ws = readLocalWorkspace();
  if (!ws) {
    writeFileSync(
      META_FILE,
      JSON.stringify({ version: 2, active: DEFAULT_PROJECT_ID, projects: { [DEFAULT_PROJECT_ID]: { name: 'Dashboard', entry } } }, null, 2) + '\n',
    );
    return;
  }
  const id = ws.activeId;
  ws.projects[id] = { ...ws.projects[id], entry };
  writeLocalWorkspace(ws);
}

export function filterDashboardFiles(files) {
  const out = {};
  for (const [path, content] of Object.entries(files ?? {})) {
    const name = path.split('/').pop() ?? path;
    if (isDashboardCodeFile(name)) out[path] = content;
  }
  return out;
}

/** Read v2 workspace from ./dashboard/ (supports legacy flat layout). */
export function readLocalWorkspace() {
  if (!existsSync(DASHBOARD_DIR)) return null;

  const meta = readMetaRaw();

  if (meta?.version === 2 && meta.projects) {
    const projects = {};
    for (const [id, info] of Object.entries(meta.projects)) {
      if (!isProjectSlug(id)) continue;
      const dir = join(DASHBOARD_DIR, id);
      const files = listProjectFiles(dir);
      if (!Object.keys(files).length) continue;
      projects[id] = {
        name: info.name || id,
        entry: info.entry || ENTRY_DEFAULT,
        files,
      };
    }
    if (!Object.keys(projects).length) return null;
    const activeId =
      isProjectSlug(meta.active) && projects[meta.active]
        ? meta.active
        : Object.keys(projects).sort()[0];
    return normalizeWorkspace({ version: 2, activeId, projects });
  }

  const rootFiles = listRootCodeFiles(DASHBOARD_DIR);
  if (!Object.keys(rootFiles).length) return null;

  const entry = meta?.entry || ENTRY_DEFAULT;
  return migrateToWorkspace({ files: rootFiles, entry });
}

function listRootCodeFiles(dir) {
  const out = {};
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.')) continue;
    const full = join(dir, name);
    if (!statSync(full).isFile()) continue;
    if (!isDashboardCodeFile(name)) continue;
    out[name] = readFileSync(full, 'utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  }
  return out;
}

export function writeLocalWorkspace(workspace) {
  const norm = normalizeWorkspace(workspace);
  if (!norm) throw new Error('Ungültiger Workspace.');

  mkdirSync(DASHBOARD_DIR, { recursive: true });
  writeFileSync(META_FILE, JSON.stringify(workspaceMeta(norm), null, 2) + '\n');

  const keepIds = new Set(Object.keys(norm.projects));

  for (const [id, project] of Object.entries(norm.projects)) {
    const dir = join(DASHBOARD_DIR, id);
    mkdirSync(dir, { recursive: true });
    for (const [path, content] of Object.entries(project.files)) {
      const full = join(dir, path);
      mkdirSync(dirname(full), { recursive: true });
      writeFileSync(full, content);
    }
    pruneProjectOrphans(dir, Object.keys(project.files));
  }

  for (const name of readdirSync(DASHBOARD_DIR)) {
    if (name.startsWith('.')) continue;
    const full = join(DASHBOARD_DIR, name);
    if (!statSync(full).isDirectory()) {
      if (isDashboardCodeFile(name)) unlinkSync(full);
      continue;
    }
    if (!keepIds.has(name)) rmSync(full, { recursive: true });
  }

  console.log('[Debug dashboard-local]: wrote workspace', {
    activeId: norm.activeId,
    projects: Object.keys(norm.projects),
  });

  return norm;
}

/** @deprecated */
export function writeLocalFiles(files) {
  const ws = readLocalWorkspace() ?? {
    version: 2,
    activeId: DEFAULT_PROJECT_ID,
    projects: {
      [DEFAULT_PROJECT_ID]: { name: 'Dashboard', entry: ENTRY_DEFAULT, files: {} },
    },
  };
  const id = ws.activeId;
  ws.projects[id] = {
    ...ws.projects[id],
    files: { ...ws.projects[id].files, ...files },
    entry: ws.projects[id]?.entry ?? ENTRY_DEFAULT,
  };
  writeLocalWorkspace(ws);
}

/** @deprecated */
export function pruneLocalOrphans(keepPaths) {
  const ws = readLocalWorkspace();
  if (!ws) return [];
  const id = ws.activeId;
  const dir = join(DASHBOARD_DIR, id);
  return pruneProjectOrphans(dir, keepPaths);
}

export function readLocalProject() {
  const ws = readLocalWorkspace();
  if (!ws) return null;
  const p = ws.projects[ws.activeId];
  if (!p) return null;
  return { files: p.files, entry: p.entry };
}

export function writeLocalProject(project) {
  if (!project?.files || Object.keys(project.files).length === 0) {
    throw new Error('Leeres Projekt – nichts zu speichern.');
  }
  let ws = readLocalWorkspace();
  if (!ws) {
    ws = {
      version: 2,
      activeId: DEFAULT_PROJECT_ID,
      projects: {
        [DEFAULT_PROJECT_ID]: {
          name: 'Dashboard',
          entry: project.entry || ENTRY_DEFAULT,
          files: project.files,
        },
      },
    };
  } else {
    const id = ws.activeId;
    ws = {
      ...ws,
      projects: {
        ...ws.projects,
        [id]: {
          ...ws.projects[id],
          files: project.files,
          entry: project.entry || ws.projects[id].entry,
        },
      },
    };
  }
  writeLocalWorkspace(ws);
}

export function writeLocalWorkspaceFromRemote(workspace) {
  const migrated = migrateToWorkspace(workspace) ?? workspace;
  return writeLocalWorkspace(migrated);
}
