import { hassStore } from '../hass/store';
import { DEFAULT_PROJECT, type Project } from './project';

// Persisted per-user inside Home Assistant via the frontend user-data store.
// No Python, no files — survives reloads and is tied to your HA login.
const KEY = 'homeassistant_dashboard_studio';
const LEGACY_KEY = 'react_dashboard_code';
const LOCAL_PROJECT_URL = '/__dashboard/project.json';

let localDashboardMode = false;

/** True when `npm run dev` loads ./dashboard/ instead of HA user_data. */
export function isLocalDashboardMode(): boolean {
  return localDashboardMode;
}

interface StoredV1 {
  code?: string; // legacy single-file shape
  files?: Record<string, string>;
  entry?: string;
}

function parseStored(value: StoredV1 | null | undefined): Project | null {
  if (value?.files && value.entry && Object.keys(value.files).length > 0) {
    return { files: value.files, entry: value.entry };
  }
  if (typeof value?.code === 'string') {
    return { entry: 'dashboard.tsx', files: { 'dashboard.tsx': value.code } };
  }
  return null;
}

async function loadLocalProject(): Promise<Project | null> {
  if (!import.meta.env.DEV) return null;
  try {
    const res = await fetch(LOCAL_PROJECT_URL);
    if (!res.ok) return null;
    const data = (await res.json()) as Project;
    if (data.files && Object.keys(data.files).length > 0) {
      return {
        files: data.files,
        entry: data.entry || 'dashboard.tsx',
      };
    }
  } catch {
    /* no local dev server endpoint */
  }
  return null;
}

export async function loadProject(): Promise<Project> {
  const local = await loadLocalProject();
  if (local) {
    localDashboardMode = true;
    return local;
  }
  localDashboardMode = false;

  const connection = hassStore.getHass()?.connection;
  if (!connection) return DEFAULT_PROJECT;
  try {
    const res = await connection.sendMessagePromise<{ value: StoredV1 | null }>({
      type: 'frontend/get_user_data',
      key: KEY,
    });
    const project = parseStored(res?.value);
    if (project) return project;

    const legacy = await connection.sendMessagePromise<{ value: StoredV1 | null }>({
      type: 'frontend/get_user_data',
      key: LEGACY_KEY,
    });
    return parseStored(legacy?.value) ?? DEFAULT_PROJECT;
  } catch {
    return DEFAULT_PROJECT;
  }
}

export async function saveProject(project: Project): Promise<void> {
  if (localDashboardMode) {
    const res = await fetch(LOCAL_PROJECT_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(project),
    });
    if (!res.ok) {
      const err = await res.text().catch(() => '');
      throw new Error(err || 'Lokales Speichern fehlgeschlagen.');
    }
    return;
  }

  const connection = hassStore.getHass()?.connection;
  if (!connection) {
    throw new Error('Keine Verbindung zu Home Assistant.');
  }
  await connection.sendMessagePromise({
    type: 'frontend/set_user_data',
    key: KEY,
    value: { files: project.files, entry: project.entry },
  });
}
