import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DASHBOARD_DIR } from './dashboard-local.mjs';

export const SYNC_META_FILE = join(DASHBOARD_DIR, '.studio-sync.json');

/** Stable hash of dashboard code files (ignores helper files). */
export function filesHash(files, entry) {
  const payload = JSON.stringify({ entry, files });
  return createHash('sha256').update(payload).digest('hex').slice(0, 16);
}

export function readSyncState() {
  if (!existsSync(SYNC_META_FILE)) return null;
  try {
    return JSON.parse(readFileSync(SYNC_META_FILE, 'utf8'));
  } catch {
    return null;
  }
}

export function writeSyncState({ files, entry, direction }) {
  writeFileSync(
    SYNC_META_FILE,
    JSON.stringify(
      {
        entry,
        filesHash: filesHash(files, entry),
        syncedAt: new Date().toISOString(),
        direction,
      },
      null,
      2,
    ) + '\n',
  );
}

export function localHasUnsyncedChanges(localFiles, entry) {
  const meta = readSyncState();
  if (!meta?.filesHash) return Object.keys(localFiles).length > 0;
  return filesHash(localFiles, entry) !== meta.filesHash;
}
