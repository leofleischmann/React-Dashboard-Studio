// Runs all code generators (SDK reference always; entity types when HA is configured).

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateEntityTypes } from './gen-entity-types.mjs';
import { generateSdkReference } from './gen-sdk-reference.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnv() {
  const env = { ...process.env };
  const envPath = join(ROOT, '.env.local');
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, 'utf8').split('\n')) {
      const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
      if (m && !line.trim().startsWith('#')) {
        env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
      }
    }
  }
  return env;
}

const env = loadEnv();
const hassUrl = env.VITE_HASS_URL;
const token = env.VITE_HASS_TOKEN;

console.log('[Debug gen-all]: SDK-Referenz generieren …');
generateSdkReference({ root: ROOT, writeDashboard: existsSync(join(ROOT, 'dashboard')) });

if (hassUrl && token) {
  console.log('[Debug gen-all]: Entity-Typen von HA laden …');
  try {
    await generateEntityTypes({ root: ROOT, hassUrl, token });
  } catch (err) {
    console.warn(`⚠️  gen:types fehlgeschlagen: ${err.message}`);
    process.exitCode = 1;
  }
} else {
  console.log('ℹ️  gen:types übersprungen (VITE_HASS_URL / VITE_HASS_TOKEN fehlt in .env.local)');
}
