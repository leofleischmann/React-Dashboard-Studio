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
  isProjectSlug,
  normalizeWorkspace,
  workspaceMeta,
} from './workspace.mjs';

export { ENTRY_DEFAULT, isDashboardCodeFile } from './project-files.mjs';
export { isProjectSlug, slugFromName, uniqueSlug } from './workspace.mjs';

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

export function filterDashboardFiles(files) {
  const out = {};
  for (const [path, content] of Object.entries(files ?? {})) {
    const name = path.split('/').pop() ?? path;
    if (isDashboardCodeFile(name)) out[path] = content;
  }
  return out;
}

/** Read workspace from ./dashboard/{project}/ + .studio.json */
export function readLocalWorkspace() {
  if (!existsSync(DASHBOARD_DIR)) return null;

  const meta = readMetaRaw();
  if (meta?.version !== 2 || !meta.projects) return null;

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

export function writeLocalWorkspaceFromRemote(workspace) {
  const norm = normalizeWorkspace(workspace);
  if (!norm) throw new Error('Ungültiger Remote-Workspace.');
  return writeLocalWorkspace(norm);
}
