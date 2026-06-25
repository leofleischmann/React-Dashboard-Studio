// Print CHANGELOG section for a version (used by GitHub auto-release).

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const version = process.argv[2];
if (!version) {
  console.error('Usage: node scripts/release-notes.mjs <version>');
  process.exit(1);
}

const changelogPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'CHANGELOG.md');
const changelog = readFileSync(changelogPath, 'utf8');
const escaped = version.replace(/\./g, '\\.');
const re = new RegExp(`## ${escaped}[\\s\\S]*?(?=\\n## |$)`);
const match = changelog.match(re);

if (!match) {
  console.log(`Keine CHANGELOG-Einträge für Version ${version}.`);
  process.exit(0);
}

console.log(match[0].trim());
