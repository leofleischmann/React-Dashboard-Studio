import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { panelBundleNames, readPanelVersion } from './bundle-names.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const destDir = join(root, 'custom_components', 'homeassistant_dashboard_studio');
const version = readPanelVersion();
const bundles = panelBundleNames(version);
const bundleFiles = Object.values(bundles);

mkdirSync(destDir, { recursive: true });

for (const name of bundleFiles) {
  const src = join(dist, name);
  if (!existsSync(src)) {
    throw new Error(`Build output missing: ${src}`);
  }
  const dest = join(destDir, name);
  copyFileSync(src, dest);
  const kb = (statSync(dest).size / 1024).toFixed(1);
  console.log(`Copied ${name} (${kb} kB) -> custom_components/homeassistant_dashboard_studio/`);
}

// Drop stale panel bundles from earlier versions or the pre-versioned layout.
const keep = new Set(bundleFiles);
for (const name of readdirSync(destDir)) {
  if (!/^dashboard(\.v[\d.]+)?\.js$/.test(name) && !/^studio-editor(\.v[\d.]+)?\.js$/.test(name)) {
    continue;
  }
  if (keep.has(name)) continue;
  unlinkSync(join(destDir, name));
  console.log(`Removed stale bundle ${name}`);
}
