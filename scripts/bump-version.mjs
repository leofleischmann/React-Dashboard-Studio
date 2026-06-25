// Passt die Projektversion in package.json, package-lock.json und manifest.json an.
// Wird von bump.bat aufgerufen. Nach dem Bump ggf. npm run build ausführen (Panel-Bundles mit neuer Versionsnummer).

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const newVersion = process.argv[2];

const SEMVER = /^\d+\.\d+\.\d+$/;

if (!newVersion || !SEMVER.test(newVersion)) {
  console.error('[Debug bump-version]: Ungueltige Version. Erwartet: X.Y.Z (z.B. 0.0.2)');
  process.exit(1);
}

const files = {
  packageJson: join(root, 'package.json'),
  packageLock: join(root, 'package-lock.json'),
  manifest: join(root, 'custom_components', 'homeassistant_dashboard_studio', 'manifest.json'),
};

function readJsonVersion(filePath) {
  const content = readFileSync(filePath, 'utf8');
  const match = /"version":\s*"([^"]+)"/.exec(content);
  if (!match) {
    throw new Error(`Kein "version"-Feld in ${filePath}`);
  }
  return { content, version: match[1] };
}

const { version: oldVersion } = readJsonVersion(files.packageJson);

if (oldVersion === newVersion) {
  console.log(`[Debug bump-version]: Version ist bereits ${newVersion}, keine Aenderung.`);
  process.exit(0);
}

console.log(`[Debug bump-version]: ${oldVersion} -> ${newVersion}`);

function updatePackageJson(content) {
  return content.replace(/("version":\s*)"[^"]+"/, `$1"${newVersion}"`);
}

function updatePackageLock(content) {
  let updated = content.replace(
    /("name": "homeassistant_dashboard_studio",\r?\n  "version": )"[^"]+"/,
    `$1"${newVersion}"`,
  );
  updated = updated.replace(
    /("packages": \{\r?\n    "": \{\r?\n      "name": "homeassistant_dashboard_studio",\r?\n      "version": )"[^"]+"/,
    `$1"${newVersion}"`,
  );
  return updated;
}

function updateManifest(content) {
  return content.replace(/("version":\s*)"[^"]+"/, `$1"${newVersion}"`);
}

const updates = [
  { path: files.packageJson, transform: updatePackageJson },
  { path: files.packageLock, transform: updatePackageLock },
  { path: files.manifest, transform: updateManifest },
];

for (const { path, transform } of updates) {
  const content = readFileSync(path, 'utf8');
  const updated = transform(content);
  if (updated === content) {
    console.error(`[Debug bump-version]: Keine Aenderung in ${path}`);
    process.exit(1);
  }
  writeFileSync(path, updated, 'utf8');
  console.log(`[Debug bump-version]: aktualisiert ${path}`);
}

console.log(`[Debug bump-version]: Version erfolgreich auf ${newVersion} gesetzt.`);
