// Vite dev server: npm run dev:default

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const child = spawn('npx', ['vite'], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, VITE_DEV_PROJECT: 'default-dashboard' },
});

child.on('exit', (code) => process.exit(code ?? 0));
