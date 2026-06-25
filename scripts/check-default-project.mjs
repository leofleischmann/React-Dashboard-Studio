// Smoke-test for the shipped default dashboard (default-dashboard/).

import { readDefaultProject } from './project-files.mjs';
import { validateDashboardProject } from './compile-check.mjs';

const project = readDefaultProject();
if (!project) {
  throw new Error('default-dashboard/ is empty or missing.');
}

const { count, entry } = validateDashboardProject({
  files: project.files,
  entry: project.entry,
  label: 'default dashboard',
});
console.log(`✓ default dashboard OK — ${count} files, entry "${entry}"`);
