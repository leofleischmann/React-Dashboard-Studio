// Smoke-test for the shipped default dashboard (src/studio/project.ts).

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname as pathDirname, join } from 'node:path';
import { transform } from 'sucrase';
import { validateDashboardProject } from './compile-check.mjs';

const here = pathDirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

const projectSrc = readFileSync(join(root, 'src/studio/defaultProject.ts'), 'utf8');
const projectJs = transform(projectSrc, {
  transforms: ['typescript', 'imports'],
  production: true,
}).code;
const mod = { exports: {} };
new Function('require', 'module', 'exports', projectJs)(
  (r) => {
    throw new Error(`defaultProject.ts must have no runtime imports (got '${r}')`);
  },
  mod,
  mod.exports,
);

const project = mod.exports.DEFAULT_PROJECT;
if (!project?.files || !project.entry) {
  throw new Error('DEFAULT_PROJECT is missing files/entry.');
}

const { count, entry } = validateDashboardProject({
  files: project.files,
  entry: project.entry,
  label: 'default dashboard',
});
console.log(`✓ default dashboard OK — ${count} files, entry "${entry}"`);
