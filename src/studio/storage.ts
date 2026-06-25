import { hassStore } from '../sdk/hass/store';
import { DEFAULT_PROJECT, blankProject, type Project } from './project';
import {
  migrateToWorkspace,
  normalizeWorkspace,
  withActiveProject,
  type Workspace,
} from './workspace';

const WS_GET = 'homeassistant_dashboard_studio/get_workspace';
const WS_SAVE = 'homeassistant_dashboard_studio/save_workspace';
const WS_SUBSCRIBE = 'homeassistant_dashboard_studio/subscribe_workspace';
const LOCAL_WORKSPACE_URL = '/__dashboard/workspace.json';

let localDashboardMode = false;

export function isLocalDashboardMode(): boolean {
  return localDashboardMode;
}

async function loadLocalWorkspace(): Promise<Workspace | null> {
  if (!import.meta.env.DEV) return null;
  try {
    const res = await fetch(LOCAL_WORKSPACE_URL);
    if (!res.ok) return null;
    const data = await res.json();
    return normalizeWorkspace(data) ?? migrateToWorkspace(data);
  } catch {
    return null;
  }
}

export async function loadWorkspace(): Promise<Workspace | null> {
  const local = await loadLocalWorkspace();
  if (local) {
    localDashboardMode = true;
    console.log('[Debug storage]: loaded local workspace', {
      activeId: local.activeId,
      projects: Object.keys(local.projects),
    });
    return local;
  }
  localDashboardMode = false;

  const connection = hassStore.getHass()?.connection;
  if (!connection) return null;
  try {
    const res = await connection.sendMessagePromise<{ workspace: unknown }>({
      type: WS_GET,
    });
    const workspace =
      normalizeWorkspace(res?.workspace) ?? migrateToWorkspace(res?.workspace);
    console.log('[Debug storage]: loaded global workspace', {
      activeId: workspace?.activeId,
      projects: workspace ? Object.keys(workspace.projects) : [],
    });
    return workspace;
  } catch (err) {
    console.warn('[Debug storage]: get_workspace failed', err);
    return null;
  }
}

export type LoadedStudioState = {
  workspace: Workspace;
  activeId: string;
  project: Project;
};

export async function loadStudioState(): Promise<LoadedStudioState> {
  const workspace = await loadWorkspace();
  if (workspace) {
    const activeId = workspace.activeId;
    const p = workspace.projects[activeId];
    return {
      workspace,
      activeId,
      project: p ? { files: p.files, entry: p.entry } : DEFAULT_PROJECT,
    };
  }
  const fallback: Workspace = {
    version: 2,
    activeId: 'default',
    projects: {
      default: { name: 'Dashboard', ...DEFAULT_PROJECT },
    },
  };
  return {
    workspace: fallback,
    activeId: 'default',
    project: DEFAULT_PROJECT,
  };
}

/** @deprecated use loadStudioState */
export async function loadProject(): Promise<Project> {
  const { project } = await loadStudioState();
  return project;
}

export function subscribeWorkspaceReset(onReset: () => void): () => void {
  const connection = hassStore.getHass()?.connection;
  if (!connection?.subscribeMessage) return () => {};

  let active = true;
  let unsub: (() => void) | undefined;
  let skipInitial = true;
  void connection
    .subscribeMessage<{ workspace: unknown }>(
      (msg) => {
        if (skipInitial) {
          skipInitial = false;
          return;
        }
        const workspace =
          normalizeWorkspace(msg?.workspace) ?? migrateToWorkspace(msg?.workspace);
        if (!workspace) {
          console.log('[Debug storage]: workspace cleared — reset to default');
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

/** @deprecated */
export const subscribeProjectReset = subscribeWorkspaceReset;

export async function saveWorkspace(workspace: Workspace): Promise<void> {
  if (localDashboardMode) {
    const res = await fetch(LOCAL_WORKSPACE_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(workspace),
    });
    if (!res.ok) {
      const err = await res.text().catch(() => '');
      throw new Error(err || 'Lokales Speichern fehlgeschlagen.');
    }
    console.log('[Debug storage]: saved local workspace');
    return;
  }

  const connection = hassStore.getHass()?.connection;
  if (!connection) throw new Error('Keine Verbindung zu Home Assistant.');
  await connection.sendMessagePromise({
    type: WS_SAVE,
    workspace,
  });
  console.log('[Debug storage]: saved global workspace', {
    activeId: workspace.activeId,
    projects: Object.keys(workspace.projects),
  });
}

export async function saveStudioState(
  workspace: Workspace,
  activeId: string,
  project: Project,
): Promise<void> {
  const next = withActiveProject(workspace, activeId, project);
  await saveWorkspace(next);
}

/** @deprecated */
export async function saveProject(project: Project): Promise<void> {
  const state = await loadStudioState();
  await saveStudioState(state.workspace, state.activeId, project);
}

export { blankProject };

// re-export workspace helpers for studio UI
export type { Workspace } from './workspace';
