import { hassStore } from '../sdk/hass/store';
import { DEFAULT_PROJECT, type Project } from './project';

// Global dashboard project — one copy per HA instance (all users).
// Persisted via integration WebSocket API → .storage/homeassistant_dashboard_studio
const WS_GET = 'homeassistant_dashboard_studio/get_project';
const WS_SAVE = 'homeassistant_dashboard_studio/save_project';
const WS_SUBSCRIBE = 'homeassistant_dashboard_studio/subscribe_project';
const LOCAL_PROJECT_URL = '/__dashboard/project.json';

let localDashboardMode = false;

/** True when `npm run dev` loads ./dashboard/ instead of HA storage. */
export function isLocalDashboardMode(): boolean {
  return localDashboardMode;
}

interface StoredProject {
  files?: Record<string, string>;
  entry?: string;
}

function parseStored(value: StoredProject | null | undefined): Project | null {
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
    console.log('[Debug storage]: loaded local ./dashboard/ project');
    return local;
  }
  localDashboardMode = false;

  const connection = hassStore.getHass()?.connection;
  if (!connection) return DEFAULT_PROJECT;
  try {
    const res = await connection.sendMessagePromise<{ project: StoredProject | null }>({
      type: WS_GET,
    });
    const project = parseStored(res?.project) ?? DEFAULT_PROJECT;
    console.log('[Debug storage]: loaded global HA project', {
      entry: project.entry,
      files: Object.keys(project.files).length,
    });
    return project;
  } catch (err) {
    console.warn('[Debug storage]: get_project failed', err);
    return DEFAULT_PROJECT;
  }
}

/** Live reload when integration options reset the global project. */
export function subscribeProjectReset(onReset: () => void): () => void {
  const connection = hassStore.getHass()?.connection;
  if (!connection?.subscribeMessage) return () => {};

  let active = true;
  let unsub: (() => void) | undefined;
  let skipInitial = true;
  void connection
    .subscribeMessage<{ project: StoredProject | null }>(
      (msg) => {
        if (skipInitial) {
          skipInitial = false;
          return;
        }
        if (!parseStored(msg?.project)) {
          console.log('[Debug storage]: global project cleared — reset to default');
          onReset();
        }
      },
      { type: WS_SUBSCRIBE },
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
    console.log('[Debug storage]: saved local ./dashboard/ project');
    return;
  }

  const connection = hassStore.getHass()?.connection;
  if (!connection) {
    throw new Error('Keine Verbindung zu Home Assistant.');
  }
  await connection.sendMessagePromise({
    type: WS_SAVE,
    project: { files: project.files, entry: project.entry },
  });
  console.log('[Debug storage]: saved global HA project', {
    entry: project.entry,
    files: Object.keys(project.files).length,
  });
}
