import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = join(root, 'custom_components', 'homeassistant_dashboard_studio', 'manifest.json');

/** Integration version from manifest.json (e.g. "0.4.5"). */
export function readPanelVersion() {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  if (!manifest.version) {
    throw new Error(`Missing version in ${manifestPath}`);
  }
  return manifest.version;
}

/** Panel bundle filenames for the current integration version. */
export function panelBundleNames(version = readPanelVersion()) {
  return {
    dashboard: `dashboard.v${version}.js`,
    studioEditor: `studio-editor.v${version}.js`,
  };
}
