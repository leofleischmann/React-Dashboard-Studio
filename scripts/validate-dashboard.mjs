// Validate ./dashboard/ workspace compiles (npm run check:dashboard).

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readLocalWorkspace } from './dashboard-local.mjs';
import { validateDashboardProject } from './compile-check.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const workspace = readLocalWorkspace();
if (!workspace || !Object.keys(workspace.projects).length) {
  console.error('Kein dashboard/ Workspace gefunden.');
  process.exit(1);
}

let total = 0;
try {
  for (const [id, project] of Object.entries(workspace.projects)) {
    const { count } = validateDashboardProject({
      files: project.files,
      entry: project.entry,
      label: `dashboard/${id}/`,
    });
    total += count;
  }
  const ids = Object.keys(workspace.projects).join(', ');
  console.log(
    `✓ dashboard/ OK — ${total} Datei(en), Projekte: ${ids}, aktiv "${workspace.activeId}".`,
  );
} catch (err) {
  console.error(`✗ ${err.message}`);
  process.exit(1);
}
