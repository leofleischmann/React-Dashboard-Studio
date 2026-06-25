// Shared helpers for the local ./dashboard/ project (sync + Vite dev server).

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

export const DASHBOARD_DIR = join(ROOT, 'dashboard');
export const META_FILE = join(DASHBOARD_DIR, '.studio.json');
export const ENTRY_DEFAULT = 'dashboard.tsx';
export const CODE_RE = /\.(tsx?|jsx?)$/;

export function listLocalFiles(dir = DASHBOARD_DIR, base = DASHBOARD_DIR) {
  const out = {};
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.')) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) Object.assign(out, listLocalFiles(full, base));
    else if (CODE_RE.test(name)) {
      const rel = relative(base, full).split(sep).join('/');
      out[rel] = readFileSync(full, 'utf8');
    }
  }
  return out;
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

export function writeLocalFiles(files) {
  for (const [path, content] of Object.entries(files)) {
    const full = join(DASHBOARD_DIR, path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content);
  }
}

export function readLocalProject() {
  const files = listLocalFiles();
  if (Object.keys(files).length === 0) return null;
  let entry = readEntry();
  if (!files[entry]) {
    entry = files[ENTRY_DEFAULT] ? ENTRY_DEFAULT : Object.keys(files).sort()[0];
  }
  return { files, entry };
}

export function writeLocalProject(project) {
  if (!project?.files || Object.keys(project.files).length === 0) {
    throw new Error('Leeres Projekt – nichts zu speichern.');
  }
  writeLocalFiles(project.files);
  writeEntry(project.entry || ENTRY_DEFAULT);
}
