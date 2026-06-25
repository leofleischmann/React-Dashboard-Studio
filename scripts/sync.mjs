// Local ⇄ Home Assistant sync for your dashboard project.
//
//   node scripts/sync.mjs pull    # HA  → ./dashboard
//   node scripts/sync.mjs push    # ./dashboard → HA
//   node scripts/sync.mjs watch   # push once, then push on every save
//
// Config: .env.local (same as `npm run dev`).

import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { existsSync, mkdirSync, readFileSync, watch as watchFs } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import WebSocket from 'ws';
import { validateDashboardProject } from './compile-check.mjs';
import {
  ENTRY_DEFAULT,
  DASHBOARD_DIR,
  filterDashboardFiles,
  isDashboardCodeFile,
  listLocalFiles,
  pruneLocalOrphans,
  readEntry,
  writeEntry,
  writeLocalFiles,
} from './dashboard-local.mjs';
import { generateEntityTypes } from './gen-entity-types.mjs';
import { generateSdkReference } from './gen-sdk-reference.mjs';
import {
  filesHash,
  readSyncState,
  writeSyncState,
} from './sync-state.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WS_GET = 'homeassistant_dashboard_studio/get_project';
const WS_SAVE = 'homeassistant_dashboard_studio/save_project';

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

async function confirm(question) {
  if (process.env.SYNC_FORCE === '1') return true;
  if (!stdin.isTTY) {
    console.error('Abgebrochen (kein interaktives Terminal). Setze SYNC_FORCE=1 zum Erzwingen.');
    return false;
  }
  const rl = createInterface({ input: stdin, output: stdout });
  const answer = await rl.question(`${question} [j/N] `);
  rl.close();
  return /^j|y|yes|ja$/i.test(answer.trim());
}

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

async function validateLocalDashboardOrConfirm() {
  const files = listLocalFiles();
  if (Object.keys(files).length === 0) return;

  console.log('🔍 Lokales dashboard/ prüfen …');
  const entry = readEntry();
  try {
    const { count } = validateDashboardProject({ files, entry, label: 'dashboard/' });
    console.log(`✓ dashboard/ kompiliert (${count} Datei(en)).`);
  } catch (err) {
    console.error(`✗ ${err.message}`);
    const ok = await confirm('Trotzdem von HA laden (pull)?');
    if (!ok) {
      throw new Error('Pull abgebrochen — bitte dashboard/ reparieren oder SYNC_FORCE=1.');
    }
  }
}

async function warnPullConflict(localFiles, localEntry, remoteFiles, remoteEntry) {
  if (Object.keys(localFiles).length === 0) return true;

  const meta = readSyncState();
  const localHash = filesHash(localFiles, localEntry);
  const remoteHash = filesHash(remoteFiles, remoteEntry);

  let reason = null;
  if (meta?.filesHash && localHash !== meta.filesHash) {
    reason = 'Lokale Änderungen seit dem letzten Sync (nicht gepusht).';
  } else if (!meta?.filesHash && localHash !== remoteHash) {
    reason = 'Lokales dashboard/ weicht von HA ab (noch nie synchronisiert).';
  }

  if (!reason) return true;

  console.warn(`\n⚠️  ${reason}`);
  if (meta?.syncedAt) {
    console.warn(`   Letzter Sync: ${meta.syncedAt} (${meta.direction ?? '?'})`);
  }
  console.warn('   Pull überschreibt ./dashboard/ mit dem Stand aus HA.\n');

  return confirm('Wirklich überschreiben?');
}

async function pull(conn) {
  await validateLocalDashboardOrConfirm();

  const localFiles = listLocalFiles();
  const localEntry = readEntry();

  const res = await conn.call({ type: WS_GET });
  const value = res?.project;
  if (!value?.files || Object.keys(value.files).length === 0) {
    console.log('In HA ist noch kein Dashboard gespeichert – nichts zu laden.');
    return;
  }

  const remoteFiles = filterDashboardFiles(value.files);
  if (Object.keys(remoteFiles).length === 0) {
    console.log('In HA sind keine Dashboard-Code-Dateien gespeichert – nichts zu laden.');
    return;
  }

  const remoteEntry = value.entry || ENTRY_DEFAULT;

  console.log('🔍 HA-Dashboard prüfen …');
  try {
    validateDashboardProject({
      files: remoteFiles,
      entry: remoteEntry,
      label: 'HA-Dashboard',
    });
    console.log(`✓ HA-Dashboard kompiliert (${Object.keys(remoteFiles).length} Datei(en)).`);
  } catch (err) {
    console.error(`✗ ${err.message}`);
    const ok = await confirm('Fehlerhaftes HA-Dashboard trotzdem laden?');
    if (!ok) throw new Error('Pull abgebrochen — HA-Dashboard hat Compile-Fehler.');
  }

  if (!(await warnPullConflict(localFiles, localEntry, remoteFiles, remoteEntry))) {
    console.log('Pull abgebrochen. Tipp: npm run sync:push zum Hochladen.');
    return;
  }

  writeLocalFiles(remoteFiles);
  const removed = pruneLocalOrphans(Object.keys(remoteFiles));
  writeEntry(remoteEntry);
  writeSyncState({ files: remoteFiles, entry: remoteEntry, direction: 'pull' });

  console.log(
    `⬇️  ${Object.keys(remoteFiles).length} Datei(en) nach dashboard/ geladen ` +
      `(Einstieg: ${remoteEntry}).`,
  );
  if (removed.length > 0) {
    console.log(`   🗑  ${removed.length} veraltete lokale Datei(en) entfernt: ${removed.join(', ')}`);
  }

  console.log('🏷  SDK-Referenz + Entity-Typen generieren …');
  try {
    generateSdkReference({ root: ROOT, writeDashboard: true });
  } catch (err) {
    console.warn(`⚠️  gen:sdk-reference fehlgeschlagen: ${err.message}`);
  }
  try {
    await generateEntityTypes({ root: ROOT, hassUrl: HASS_URL, token: TOKEN });
  } catch (err) {
    console.warn(`⚠️  gen:types fehlgeschlagen: ${err.message}`);
  }
}

async function push(conn) {
  const files = listLocalFiles();
  if (Object.keys(files).length === 0) {
    throw new Error('Keine Code-Dateien in dashboard/ gefunden – erst "pull" oder Dateien anlegen.');
  }

  console.log('🔍 Lokales dashboard/ prüfen …');
  let entry = readEntry();
  if (!files[entry]) entry = files[ENTRY_DEFAULT] ? ENTRY_DEFAULT : Object.keys(files).sort()[0];
  const { count } = validateDashboardProject({ files, entry, label: 'dashboard/' });
  console.log(`✓ dashboard/ kompiliert (${count} Datei(en)).`);

  const res = await conn.call({ type: WS_GET });
  const remoteCode = filterDashboardFiles(res?.project?.files ?? {});
  const removed = Object.keys(remoteCode).filter((path) => !(path in files));

  await conn.call({
    type: WS_SAVE,
    project: { files, entry },
  });
  writeSyncState({ files, entry, direction: 'push' });

  const stamp = new Date().toLocaleTimeString();
  console.log(
    `⬆️  [${stamp}] ${Object.keys(files).length} Datei(en) zu HA gepusht ` +
      `(Einstieg: ${entry}). Studio/Dashboard neu laden zum Sehen.`,
  );
  if (removed.length > 0) {
    console.log(`   🗑  ${removed.length} entfernte Datei(en) in HA gelöscht: ${removed.join(', ')}`);
  }
}

async function watch(conn) {
  await push(conn);
  mkdirSync(DASHBOARD_DIR, { recursive: true });
  console.log('👀 Beobachte dashboard/ … speichere eine Datei, um zu pushen (Strg+C beendet).');

  let timer = null;
  const schedulePush = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(async () => {
      try {
        await push(conn);
      } catch (err) {
        console.error('Push fehlgeschlagen:', err.message);
      }
    }, 400);
  };

  watchFs(DASHBOARD_DIR, { recursive: true }, (_event, filename) => {
    if (!filename) return;
    const base = filename.replace(/\\/g, '/').split('/').pop() ?? '';
    if (!isDashboardCodeFile(base)) return;
    schedulePush();
  });
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
