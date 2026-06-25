import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const destDir = join(root, 'custom_components', 'homeassistant_dashboard_studio');

const bundles = ['dashboard.js', 'studio-editor.js'];

mkdirSync(destDir, { recursive: true });

for (const name of bundles) {
  const src = join(dist, name);
  if (!existsSync(src)) {
    throw new Error(`Build output missing: ${src}`);
  }
  const dest = join(destDir, name);
  copyFileSync(src, dest);
  const kb = (statSync(dest).size / 1024).toFixed(1);
  console.log(`Copied ${name} (${kb} kB) -> custom_components/homeassistant_dashboard_studio/`);
}
