import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DASHBOARD_DIR } from './dashboard-local.mjs';

export const SYNC_META_FILE = join(DASHBOARD_DIR, '.studio-sync.json');

/** Stable hash of the full workspace. */
export function workspaceHash(workspace) {
  const payload = JSON.stringify(workspace);
  return createHash('sha256').update(payload).digest('hex').slice(0, 16);
}

/** @deprecated */
export function filesHash(files, entry) {
  return workspaceHash({
    version: 2,
    activeId: entry,
    projects: { sync: { name: 'sync', entry, files } },
  });
}

export function readSyncState() {
  if (!existsSync(SYNC_META_FILE)) return null;
  try {
    return JSON.parse(readFileSync(SYNC_META_FILE, 'utf8'));
  } catch {
    return null;
  }
}

export function writeSyncState({ workspace, direction }) {
  writeFileSync(
    SYNC_META_FILE,
    JSON.stringify(
      {
        workspaceHash: workspaceHash(workspace),
        activeId: workspace.activeId,
        projectIds: Object.keys(workspace.projects).sort(),
        syncedAt: new Date().toISOString(),
        direction,
      },
      null,
      2,
    ) + '\n',
  );
}

export function localHasUnsyncedChanges(localWorkspace) {
  if (!localWorkspace) return false;
  const meta = readSyncState();
  if (!meta?.workspaceHash) return Object.keys(localWorkspace.projects).length > 0;
  return workspaceHash(localWorkspace) !== meta.workspaceHash;
}
