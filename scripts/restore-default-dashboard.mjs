// Kopiert default-dashboard/ → ./dashboard/{projectId}/ für sync:push.
// Bestehende Projekte in .studio.json bleiben erhalten (merge).
// Nutzung: node scripts/restore-default-dashboard.mjs [projectId]

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readDefaultProject } from './project-files.mjs';
import { readLocalWorkspace, writeLocalWorkspace } from './dashboard-local.mjs';
import { normalizeWorkspace } from './workspace.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const projectId = (process.argv[2] || 'demo').trim();

if (!/^[a-z][a-z0-9_-]{0,31}$/.test(projectId)) {
  console.error('Ungültige Projekt-ID (z. B. demo oder default).');
  process.exit(1);
}

const bundled = readDefaultProject();
if (!bundled) {
  console.error('default-dashboard/ fehlt oder ist leer.');
  process.exit(1);
}

const existing = readLocalWorkspace();
const workspace = existing ?? {
  version: 2,
  activeId: projectId,
  projects: {},
};

workspace.projects[projectId] = {
  name: 'Beispiel-Dashboard',
  files: bundled.files,
  entry: bundled.entry,
};

if (!existing) {
  workspace.activeId = projectId;
}

const norm = normalizeWorkspace(workspace);
writeLocalWorkspace(norm);

console.log(
  `✓ Beispiel-Dashboard nach dashboard/${projectId}/ kopiert (${Object.keys(bundled.files).length} Dateien).`,
);
console.log(`  Aktiv in .studio.json: ${norm.activeId}`);
console.log('  Nächster Schritt: npm run sync:push');
