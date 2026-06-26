import { hassStore } from '../sdk/hass/store';
import { DEFAULT_PROJECT, blankProject, type Project } from './project';
import { normalizeWorkspace, withActiveProject, type Workspace } from './workspace';

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
    return normalizeWorkspace(data);
  } catch {
    return null;
  }
}

export async function loadWorkspace(): Promise<Workspace | null> {
  const local = await loadLocalWorkspace();
  if (local) {
    localDashboardMode = true;
    return local;
  }
  localDashboardMode = false;

  const connection = hassStore.getHass()?.connection;
  if (!connection) return null;
  try {
    const res = await connection.sendMessagePromise<{ workspace: unknown }>({
      type: WS_GET,
    });
    const workspace = normalizeWorkspace(res?.workspace);
    return workspace;
  } catch (err) {
    return null;
  }
}

export type LoadedStudioState = {
  workspace: Workspace;
  activeId: string;
  project: Project;
};

export async function loadStudioState(boundProjectId?: string): Promise<LoadedStudioState> {
  const workspace = await loadWorkspace();
  if (workspace) {
    const panelId = boundProjectId?.trim();
    const activeId =
      panelId && workspace.projects[panelId]
        ? panelId
        : workspace.activeId;
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
        if (!normalizeWorkspace(msg?.workspace)) {
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
    return;
  }

  const connection = hassStore.getHass()?.connection;
  if (!connection) throw new Error('Keine Verbindung zu Home Assistant.');
  await connection.sendMessagePromise({
    type: WS_SAVE,
    workspace,
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

export { blankProject };
export type { Workspace } from './workspace';
