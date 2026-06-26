// Eject @ha/ui widgets in every file under ./dashboard/ — used by studio.bat (option 7).
// For a single file: npm run eject:imports -- dashboard/pages/Foo.tsx

import { existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { isDashboardCodeFile, PERSONAL_DASHBOARD_DIR } from './project-files.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function listDashboardFiles(dir) {
  const out = [];
  if (!existsSync(dir)) return out;

  function walk(current) {
    for (const name of readdirSync(current)) {
      if (name.startsWith('.')) continue;
      const full = join(current, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (isDashboardCodeFile(name)) out.push(full);
    }
  }

  walk(dir);
  return out.sort();
}

const flags = process.argv.slice(2);
const files = listDashboardFiles(PERSONAL_DASHBOARD_DIR);

if (!files.length) {
  console.error(
    '[Debug eject-dashboard]: Kein dashboard/ mit Quelldateien — zuerst npm run sync:pull.',
  );
  process.exit(1);
}

console.log(`[Debug eject-dashboard]: ${files.length} Datei(en) in dashboard/`);

const result = spawnSync(
  process.execPath,
  [join(ROOT, 'scripts/eject-imports.mjs'), ...files, ...flags],
  { stdio: 'inherit', cwd: ROOT },
);

process.exit(result.status ?? 1);
