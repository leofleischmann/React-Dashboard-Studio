// Validate ./dashboard/ compiles (npm run check:dashboard).

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ENTRY_DEFAULT,
  listLocalFiles,
  readEntry,
} from './dashboard-local.mjs';
import { validateDashboardProject } from './compile-check.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const files = listLocalFiles();
if (Object.keys(files).length === 0) {
  console.error('Kein dashboard/ Projekt gefunden.');
  process.exit(1);
}

const entry = readEntry();
try {
  const { count } = validateDashboardProject({ files, entry, label: 'dashboard/' });
  console.log(`✓ dashboard/ OK — ${count} Datei(en), Einstieg "${entry || ENTRY_DEFAULT}".`);
} catch (err) {
  console.error(`✗ ${err.message}`);
  process.exit(1);
}
