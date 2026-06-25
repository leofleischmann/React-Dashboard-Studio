// Shared helpers for the local ./dashboard/ project (sync + Vite dev server).

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
  readProjectFromDir,
} from './project-files.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Active dev project: personal dashboard/ or default-dashboard/ via VITE_DEV_PROJECT. */
export const DASHBOARD_DIR =
  process.env.VITE_DEV_PROJECT === 'default-dashboard'
    ? DEFAULT_DASHBOARD_DIR
    : PERSONAL_DASHBOARD_DIR;

export const META_FILE = join(DASHBOARD_DIR, '.studio.json');

export function listLocalFiles(dir = DASHBOARD_DIR) {
  return listProjectFiles(dir);
}

export function readEntry() {
  if (!existsSync(META_FILE)) return ENTRY_DEFAULT;
  try {
    return JSON.parse(readFileSync(META_FILE, 'utf8')).entry || ENTRY_DEFAULT;
  } catch {
    return ENTRY_DEFAULT;
  }
}

export function writeEntry(entry) {
  mkdirSync(DASHBOARD_DIR, { recursive: true });
  writeFileSync(META_FILE, JSON.stringify({ entry }, null, 2) + '\n');
}

export function filterDashboardFiles(files) {
  const out = {};
  for (const [path, content] of Object.entries(files ?? {})) {
    const name = path.split('/').pop() ?? path;
    if (isDashboardCodeFile(name)) out[path] = content;
  }
  return out;
}

export function writeLocalFiles(files) {
  for (const [path, content] of Object.entries(files)) {
    const full = join(DASHBOARD_DIR, path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content);
  }
}

/** Remove dashboard code files on disk that are no longer in the project. */
export function pruneLocalOrphans(keepPaths) {
  const keep = new Set(keepPaths);
  if (!existsSync(DASHBOARD_DIR)) return [];

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

  walk(DASHBOARD_DIR, DASHBOARD_DIR);
  return removed;
}

export function readLocalProject() {
  const entry = readEntry();
  return readProjectFromDir(DASHBOARD_DIR, entry);
}

export function writeLocalProject(project) {
  if (!project?.files || Object.keys(project.files).length === 0) {
    throw new Error('Leeres Projekt – nichts zu speichern.');
  }
  writeLocalFiles(project.files);
  pruneLocalOrphans(Object.keys(project.files));
  writeEntry(project.entry || ENTRY_DEFAULT);
}
