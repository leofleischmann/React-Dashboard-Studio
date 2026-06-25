// Shared helpers for reading virtual dashboard projects from disk (default-dashboard/, dashboard/).

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

export const DEFAULT_DASHBOARD_DIR = join(ROOT, 'default-dashboard');
export const PERSONAL_DASHBOARD_DIR = join(ROOT, 'dashboard');
export const ENTRY_DEFAULT = 'dashboard.tsx';
export const CODE_RE = /\.(tsx?|jsx?)$/;

/** Normalize to LF so embed output is identical on Windows and Linux CI. */
export function normalizeLineEndings(text) {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/** Dashboard source only — excludes VS Code helpers like `ha-entities.d.ts`. */
export function isDashboardCodeFile(name) {
  return CODE_RE.test(name) && !name.endsWith('.d.ts');
}

/** Recursively list dashboard code files under `dir` (posix-style relative paths). */
export function listProjectFiles(dir) {
  const out = {};
  if (!existsSync(dir)) return out;

  function walk(current, base) {
    for (const name of readdirSync(current)) {
      if (name.startsWith('.')) continue;
      const full = join(current, name);
      if (statSync(full).isDirectory()) {
        walk(full, base);
        continue;
      }
      if (!isDashboardCodeFile(name)) continue;
      const rel = relative(base, full).split(sep).join('/');
      out[rel] = normalizeLineEndings(readFileSync(full, 'utf8'));
    }
  }

  walk(dir, dir);
  return out;
}

/**
 * @param {string} dir
 * @param {string} [entry]
 * @returns {{ files: Record<string, string>; entry: string } | null}
 */
export function readProjectFromDir(dir, entry = ENTRY_DEFAULT) {
  const files = listProjectFiles(dir);
  if (Object.keys(files).length === 0) return null;

  let resolvedEntry = entry;
  if (!files[resolvedEntry]) {
    resolvedEntry = files[ENTRY_DEFAULT] ? ENTRY_DEFAULT : Object.keys(files).sort()[0];
  }
  return { files, entry: resolvedEntry };
}

/** @returns {{ files: Record<string, string>; entry: string } | null} */
export function readDefaultProject() {
  return readProjectFromDir(DEFAULT_DASHBOARD_DIR);
}
