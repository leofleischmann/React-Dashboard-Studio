// Local ⇄ Home Assistant sync for your dashboard workspace.
//
//   node scripts/sync.mjs pull    # HA  → ./dashboard/{project}/
//   node scripts/sync.mjs push    # ./dashboard → HA
//   node scripts/sync.mjs watch   # push once, then push on every save

import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { existsSync, mkdirSync, readFileSync, watch as watchFs } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import WebSocket from 'ws';
import { validateDashboardProject } from './compile-check.mjs';
import {
  DASHBOARD_DIR,
  isDashboardCodeFile,
  readLocalWorkspace,
  writeLocalWorkspaceFromRemote,
} from './dashboard-local.mjs';
import { generateEntityTypes } from './gen-entity-types.mjs';
import { generateSdkReference } from './gen-sdk-reference.mjs';
import { readSyncState, workspaceHash, writeSyncState } from './sync-state.mjs';
import { normalizeWorkspace } from './workspace.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WS_GET = 'homeassistant_dashboard_studio/get_workspace';
const WS_SAVE = 'homeassistant_dashboard_studio/save_workspace';

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

function validateWorkspaceProjects(workspace, label) {
  let total = 0;
  for (const [id, project] of Object.entries(workspace.projects)) {
    const { count } = validateDashboardProject({
      files: project.files,
      entry: project.entry,
      label: `${label}${id}/`,
    });
    total += count;
  }
  return total;
}

async function validateLocalWorkspaceOrConfirm() {
  const local = readLocalWorkspace();
  if (!local) return;

  console.log('🔍 Lokales dashboard/ prüfen …');
  try {
    const count = validateWorkspaceProjects(local, 'dashboard/');
    const ids = Object.keys(local.projects).join(', ');
    console.log(`✓ dashboard/ kompiliert (${count} Datei(en), Projekte: ${ids}).`);
  } catch (err) {
    console.error(`✗ ${err.message}`);
    const ok = await confirm('Trotzdem von HA laden (pull)?');
    if (!ok) {
      throw new Error('Pull abgebrochen — bitte dashboard/ reparieren oder SYNC_FORCE=1.');
    }
  }
}

async function warnPullConflict(localWorkspace, remoteWorkspace) {
  if (!localWorkspace || !Object.keys(localWorkspace.projects).length) return true;

  const meta = readSyncState();
  const localHash = workspaceHash(localWorkspace);
  const remoteHash = workspaceHash(remoteWorkspace);

  let reason = null;
  if (meta?.workspaceHash && localHash !== meta.workspaceHash) {
    reason = 'Lokale Änderungen seit dem letzten Sync (nicht gepusht).';
  } else if (!meta?.workspaceHash && localHash !== remoteHash) {
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
  await validateLocalWorkspaceOrConfirm();

  const localWorkspace = readLocalWorkspace();

  const res = await conn.call({ type: WS_GET });
  const remoteWorkspace = normalizeWorkspace(res?.workspace);
  if (!remoteWorkspace) {
    console.log('In HA ist noch kein Dashboard gespeichert – nichts zu laden.');
    return;
  }

  console.log('🔍 HA-Dashboards prüfen …');
  try {
    const count = validateWorkspaceProjects(remoteWorkspace, 'HA/');
    const ids = Object.keys(remoteWorkspace.projects).join(', ');
    console.log(`✓ HA-Workspace kompiliert (${count} Datei(en), Projekte: ${ids}).`);
  } catch (err) {
    console.error(`✗ ${err.message}`);
    const ok = await confirm('Fehlerhafte HA-Dashboards trotzdem laden?');
    if (!ok) throw new Error('Pull abgebrochen — HA-Workspace hat Compile-Fehler.');
  }

  if (!(await warnPullConflict(localWorkspace, remoteWorkspace))) {
    console.log('Pull abgebrochen. Tipp: npm run sync:push zum Hochladen.');
    return;
  }

  writeLocalWorkspaceFromRemote(remoteWorkspace);
  writeSyncState({ workspace: remoteWorkspace, direction: 'pull' });

  const projectCount = Object.keys(remoteWorkspace.projects).length;
  const fileCount = Object.values(remoteWorkspace.projects).reduce(
    (n, p) => n + Object.keys(p.files).length,
    0,
  );
  console.log(
    `⬇️  ${fileCount} Datei(en) in ${projectCount} Projekt(en) nach dashboard/ geladen ` +
      `(aktiv: ${remoteWorkspace.activeId}).`,
  );

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
  const workspace = readLocalWorkspace();
  if (!workspace || !Object.keys(workspace.projects).length) {
    throw new Error(
      'Kein dashboard/ Workspace gefunden – erst "pull" oder Projekte anlegen.',
    );
  }

  console.log('🔍 Lokales dashboard/ prüfen …');
  const count = validateWorkspaceProjects(workspace, 'dashboard/');
  const ids = Object.keys(workspace.projects).join(', ');
  console.log(`✓ dashboard/ kompiliert (${count} Datei(en), Projekte: ${ids}).`);

  const res = await conn.call({ type: WS_GET });
  const remote = normalizeWorkspace(res?.workspace);
  const remoteIds = new Set(Object.keys(remote?.projects ?? {}));
  const removed = [...remoteIds].filter((id) => !(id in workspace.projects));

  await conn.call({ type: WS_SAVE, workspace });
  writeSyncState({ workspace, direction: 'push' });

  const fileCount = Object.values(workspace.projects).reduce(
    (n, p) => n + Object.keys(p.files).length,
    0,
  );
  const stamp = new Date().toLocaleTimeString();
  console.log(
    `⬆️  [${stamp}] ${fileCount} Datei(en) in ${Object.keys(workspace.projects).length} Projekt(en) zu HA gepusht ` +
      `(aktiv: ${workspace.activeId}). Studio neu laden zum Sehen.`,
  );
  if (removed.length > 0) {
    console.log(`   🗑  ${removed.length} entfernte Projekt(e) in HA gelöscht: ${removed.join(', ')}`);
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
    if (base === '.studio.json' || base === '.studio-sync.json') return;
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
