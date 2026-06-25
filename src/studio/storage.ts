import { hassStore } from '../sdk/hass/store';
import { DEFAULT_PROJECT, type Project } from './project';

// Persisted per-user inside Home Assistant via the frontend user-data store.
// No Python, no files — survives reloads and is tied to your HA login.
const KEY = 'homeassistant_dashboard_studio';
const LOCAL_PROJECT_URL = '/__dashboard/project.json';

let localDashboardMode = false;

/** True when `npm run dev` loads ./dashboard/ instead of HA user_data. */
export function isLocalDashboardMode(): boolean {
  return localDashboardMode;
}

interface StoredV1 {
  files?: Record<string, string>;
  entry?: string;
}

function parseStored(value: StoredV1 | null | undefined): Project | null {
  if (value?.files && value.entry && Object.keys(value.files).length > 0) {
    return { files: value.files, entry: value.entry };
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
    return parseStored(res?.value) ?? DEFAULT_PROJECT;
  } catch {
    return DEFAULT_PROJECT;
  }
}

/** Live reload when integration options clear saved user_data (reset to default). */
export function subscribeProjectReset(onReset: () => void): () => void {
  const connection = hassStore.getHass()?.connection;
  if (!connection?.subscribeMessage) return () => {};

  let active = true;
  let unsub: (() => void) | undefined;
  void connection
    .subscribeMessage<{ value: StoredV1 | null }>(
      (msg) => {
        if (!parseStored(msg?.value)) onReset();
      },
      { type: 'frontend/subscribe_user_data', key: KEY },
    )
    .then((fn) => {
      if (active) unsub = fn;
      else fn();
    });

  return () => {
    active = false;
    unsub?.();
  };
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
