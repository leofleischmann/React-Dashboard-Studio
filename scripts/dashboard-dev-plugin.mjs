// Vite plugin: serve ./dashboard/ workspace to the local dev Studio.

import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DASHBOARD_DIR,
  readLocalWorkspace,
  writeLocalWorkspace,
} from './dashboard-local.mjs';

const API = '/__dashboard/workspace.json';

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function isDashboardFile(file) {
  return file.startsWith(DASHBOARD_DIR);
}

/**
 * @returns {import('vite').Plugin}
 */
export function dashboardDevPlugin() {
  return {
    name: 'homeassistant-dashboard-studio-local',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url !== API) return next();

        if (req.method === 'GET' || req.method === 'HEAD') {
          const workspace = readLocalWorkspace();
          if (!workspace) {
            res.statusCode = 404;
            res.end(JSON.stringify({ error: 'Kein dashboard/ Workspace gefunden.' }));
            return;
          }
          res.setHeader('Content-Type', 'application/json');
          if (req.method === 'HEAD') {
            res.statusCode = 200;
            res.end();
            return;
          }
          res.end(JSON.stringify(workspace));
          return;
        }

        if (req.method === 'PUT') {
          try {
            const raw = await readBody(req);
            const workspace = JSON.parse(raw);
            writeLocalWorkspace(workspace);
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true }));
          } catch (err) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: err.message }));
          }
          return;
        }

        next();
      });

      server.watcher.add(join(DASHBOARD_DIR, '**/*'));

      const notify = (file) => {
        if (!isDashboardFile(file)) return;
        if (file.endsWith('.studio.json')) return;
        server.ws.send({ type: 'custom', event: 'dashboard-changed' });
      };

      server.watcher.on('change', notify);
      server.watcher.on('add', notify);
      server.watcher.on('unlink', notify);
    },
  };
}
