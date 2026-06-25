// Local ⇄ Home Assistant sync for your dashboard project.
//
//   node scripts/sync.mjs pull    # HA  → ./dashboard
//   node scripts/sync.mjs push    # ./dashboard → HA
//   node scripts/sync.mjs watch   # push once, then push on every save
//
// Config: .env.local (same as `npm run dev`).

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import WebSocket from 'ws';
import {
  DASHBOARD_DIR,
  ENTRY_DEFAULT,
  listLocalFiles,
  readEntry,
  writeEntry,
  writeLocalFiles,
} from './dashboard-local.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const STORAGE_KEY = 'homeassistant_dashboard_studio';

function loadEnv() {
  const env = { ...process.env };
  const file = join(ROOT, '.env.local');
  if (existsSync(file)) {
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m && !line.trim().startsWith('#')) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
    }
  }
  return env;
}

const env = loadEnv();
const HASS_URL = (env.VITE_HASS_URL || '').replace(/\/+$/, '');
const TOKEN = env.VITE_HASS_TOKEN || '';
if (!HASS_URL || !TOKEN) {
  console.error(
    'Fehlende Konfiguration. Lege .env.local an (Vorlage: .env.local.example) mit\n' +
      '  VITE_HASS_URL=http://homeassistant.local:8123\n' +
      '  VITE_HASS_TOKEN=<Long-Lived Access Token>',
  );
  process.exit(1);
}
const WS_URL = HASS_URL.replace(/^http/, 'ws') + '/api/websocket';

function connect() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);
    const pending = new Map();
    let nextId = 1;
    let intentionalClose = false;

    ws.on('message', (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }
      if (msg.type === 'auth_required') {
        ws.send(JSON.stringify({ type: 'auth', access_token: TOKEN }));
      } else if (msg.type === 'auth_ok') {
        resolve({
          call: (payload) =>
            new Promise((res, rej) => {
              const id = nextId++;
              pending.set(id, { res, rej });
              ws.send(JSON.stringify({ id, ...payload }));
            }),
          close: () => {
            intentionalClose = true;
            ws.close();
          },
        });
      } else if (msg.type === 'auth_invalid') {
        reject(new Error('Authentifizierung fehlgeschlagen – Token ungültig/abgelaufen.'));
        ws.close();
      } else if (msg.type === 'result') {
        const p = pending.get(msg.id);
        if (!p) return;
        pending.delete(msg.id);
        if (msg.success) p.res(msg.result);
        else p.rej(new Error(msg.error?.message || 'Unbekannter WebSocket-Fehler'));
      }
    });

    ws.on('error', (err) =>
      reject(new Error(`Verbindung zu ${WS_URL} fehlgeschlagen: ${err.message}`)),
    );
    ws.on('close', () => {
      if (!intentionalClose) {
        console.error('Verbindung zu Home Assistant geschlossen. Bitte erneut starten.');
        process.exit(1);
      }
    });
  });
}

async function pull(conn) {
  const res = await conn.call({ type: 'frontend/get_user_data', key: STORAGE_KEY });
  const value = res?.value;
  if (!value?.files || Object.keys(value.files).length === 0) {
    console.log('In HA ist noch kein Dashboard gespeichert – nichts zu laden.');
    return;
  }
  writeLocalFiles(value.files);
  writeEntry(value.entry || ENTRY_DEFAULT);
  console.log(
    `⬇️  ${Object.keys(value.files).length} Datei(en) nach dashboard/ geladen ` +
      `(Einstieg: ${value.entry || ENTRY_DEFAULT}).`,
  );
}

async function push(conn) {
  const files = listLocalFiles();
  if (Object.keys(files).length === 0) {
    throw new Error('Keine Code-Dateien in dashboard/ gefunden – erst "pull" oder Dateien anlegen.');
  }
  let entry = readEntry();
  if (!files[entry]) entry = files[ENTRY_DEFAULT] ? ENTRY_DEFAULT : Object.keys(files).sort()[0];
  await conn.call({
    type: 'frontend/set_user_data',
    key: STORAGE_KEY,
    value: { files, entry },
  });
  const stamp = new Date().toLocaleTimeString();
  console.log(
    `⬆️  [${stamp}] ${Object.keys(files).length} Datei(en) zu HA gepusht ` +
      `(Einstieg: ${entry}). Studio/Dashboard neu laden zum Sehen.`,
  );
}

async function watch(conn) {
  await push(conn);
  console.log('👀 Beobachte dashboard/ … speichere eine Datei, um zu pushen (Strg+C beendet).');
  let last = JSON.stringify(listLocalFiles());
  setInterval(async () => {
    const now = JSON.stringify(listLocalFiles());
    if (now === last) return;
    last = now;
    try {
      await push(conn);
    } catch (err) {
      console.error('Push fehlgeschlagen:', err.message);
    }
  }, 800);
}

const cmd = process.argv[2] || 'watch';
if (!['pull', 'push', 'watch'].includes(cmd)) {
  console.error('Nutzung: node scripts/sync.mjs <pull|push|watch>');
  process.exit(1);
}

let conn;
try {
  conn = await connect();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

try {
  if (cmd === 'pull') await pull(conn);
  else if (cmd === 'push') await push(conn);
  else await watch(conn);
} catch (err) {
  console.error(err.message);
  conn.close();
  process.exit(1);
}
if (cmd !== 'watch') conn.close();
