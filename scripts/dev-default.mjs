// Vite dev server: npm run dev:default

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Honor a PORT env var (e.g. from preview tooling) so the dev server can run on
// a chosen free port; otherwise Vite uses its default (5173).
const viteArgs = ['vite'];
if (process.env.PORT) {
  viteArgs.push('--port', process.env.PORT, '--strictPort');
}

const child = spawn('npx', viteArgs, {
  cwd: root,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, VITE_DEV_PROJECT: 'default-dashboard' },
});

child.on('exit', (code) => process.exit(code ?? 0));
