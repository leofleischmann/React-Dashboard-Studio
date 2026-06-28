import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { clearAllClientIntegrationData } from '../sdk/dashboard/store';
import { useAuthorDebugEnabled, useDebugActive } from '../sdk/debug/hooks';
import { useHassReady, useIsMobile } from '../sdk/hass/hooks';
import { readDarkMode } from '../sdk/hass/theme';
import { hassStore } from '../sdk/hass/stores/hassStore';
import { projectUsesDefaultDashboardStyles } from '../lib/projectUsesDefaultStyles';
import { syncDefaultDashboardStyles } from '../mount';
import { useRenderRoot } from './shadowRoot';
import { clearCompileCache, compileProject } from './compile';
import {
  isLocalDashboardMode,
  loadStudioState,
  saveStudioState,
  saveWorkspace,
  subscribeWorkspaceReset,
  blankProject,
} from './storage';
import { DEFAULT_PROJECT, type Project } from './project';
import {
  createWorkspaceProject,
  deleteWorkspaceProject,
  panelUrlPath,
  renameWorkspaceProject,
  withActiveProject,
  type Workspace,
} from './workspace';
import { navigateToProjectPanel } from './panelNav';
import { panelStore } from './panelStore';
import { Preview } from './Preview';
import { StudioToolbar } from './StudioToolbar';
import { useSplitDrag } from './useSplitDrag';

const loadEditorModule = () => import('./studio-editor-module');
const StudioEditorLayout = lazy(() => loadEditorModule());
const DevEntityInserter = lazy(() =>
  loadEditorModule().then((m) => ({ default: m.DevEntityInserter })),
);

type Mode = 'view' | 'edit';

const serialize = (p: Project) => JSON.stringify({ e: p.entry, f: p.files });

const DEV_PREVIEW_DARK_KEY = 'rd-dev-preview-dark';

function readStoredPreviewDark(): boolean | null {
  try {
    const value = localStorage.getItem(DEV_PREVIEW_DARK_KEY);
    if (value === '1') return true;
    if (value === '0') return false;
  } catch {
    /* private mode / blocked storage */
  }
  return null;
}

/** `npm run dev` — preview only; code is edited in VS Code (./dashboard/). */
const isDevPreview = import.meta.env.DEV;

export default function Studio() {
  const ready = useHassReady();
  const mobile = useIsMobile();

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [savedWorkspace, setSavedWorkspace] = useState<Workspace | null>(null);
  const [boundProjectId, setBoundProjectId] = useState(
    () => panelStore.getProjectId() ?? 'default',
  );
  const [project, setProject] = useState<Project>(DEFAULT_PROJECT);
  const [savedProject, setSavedProject] = useState<Project>(DEFAULT_PROJECT);
  const [activePath, setActivePath] = useState<string>(DEFAULT_PROJECT.entry);
  const [loaded, setLoaded] = useState(false);
  const [localMode, setLocalMode] = useState(false);
  const [mode, setMode] = useState<Mode>('view');
  const [inserterOpen, setInserterOpen] = useState(false);
  const [entityBrowserOpen, setEntityBrowserOpen] = useState(false);
  const storedPreviewDarkRef = useRef(readStoredPreviewDark());
  const [previewDark, setPreviewDark] = useState(
    () => storedPreviewDarkRef.current ?? false,
  );

  const [Dashboard, setDashboard] = useState<ComponentType | null>(null);
  const [version, setVersion] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { splitRef, splitPct, startDrag } = useSplitDrag(46);
  const [authorDebug, setAuthorDebug] = useAuthorDebugEnabled();
  const debugActive = useDebugActive();

  const changedPathRef = useRef<string | null>(null);
  const fullRebuildRef = useRef(false);
  const hasCompiledRef = useRef(false);
  const renderRoot = useRenderRoot();

  useEffect(() => {
    if (!loaded || !(renderRoot instanceof ShadowRoot)) return;
    const needs = projectUsesDefaultDashboardStyles(project);
    syncDefaultDashboardStyles(renderRoot, needs);
  }, [loaded, project, renderRoot]);

  useEffect(() => {
    if (!isDevPreview) return;
    hassStore.setPreviewDarkModeOverride(previewDark);
    return () => hassStore.setPreviewDarkModeOverride(null);
  }, [previewDark]);

  useEffect(() => {
    if (!isDevPreview || storedPreviewDarkRef.current !== null || !ready) return;
    setPreviewDark(readDarkMode());
  }, [ready]);

  const setPreviewDarkMode = useCallback((dark: boolean) => {
    setPreviewDark(dark);
    storedPreviewDarkRef.current = dark;
    try {
      localStorage.setItem(DEV_PREVIEW_DARK_KEY, dark ? '1' : '0');
    } catch {
      /* ignore */
    }
    console.log('[Debug Studio]: preview dark mode', dark);
  }, []);

  useEffect(() => {
    return panelStore.subscribe(() => {
      const id = panelStore.getProjectId();
      if (id) setBoundProjectId(id);
    });
  }, []);

  useEffect(() => {
    if (!ready || loaded) return;
    let cancelled = false;
    const panelId = panelStore.getProjectId() ?? undefined;
    loadStudioState(panelId).then((state) => {
      if (cancelled) return;
      const fromLocal = isLocalDashboardMode();
      setLocalMode(fromLocal);
      setWorkspace(state.workspace);
      setSavedWorkspace(state.workspace);
      setBoundProjectId(state.activeId);
      setProject(state.project);
      setSavedProject(state.project);
      setActivePath(
        state.project.files[state.project.entry] !== undefined
          ? state.project.entry
          : Object.keys(state.project.files)[0],
      );
      setLoaded(true);
      fullRebuildRef.current = true;
    });
    return () => {
      cancelled = true;
    };
  }, [ready, loaded]);

  useEffect(() => {
    if (!ready || !loaded || localMode) return;
    return subscribeWorkspaceReset(() => {
      clearAllClientIntegrationData();
      clearCompileCache();
      const defaultPath = `/${panelUrlPath('default')}`;
      if (window.location.pathname !== defaultPath) {
        window.location.assign(defaultPath);
      } else {
        window.location.reload();
      }
    });
  }, [ready, loaded, localMode]);

  useEffect(() => {
    if (!import.meta.hot) return;
    const reloadFromDisk = async () => {
      if (!isLocalDashboardMode()) return;
      const state = await loadStudioState();
      fullRebuildRef.current = true;
      clearCompileCache();
      setWorkspace(state.workspace);
      setSavedWorkspace(state.workspace);
      setBoundProjectId(state.activeId);
      setProject(state.project);
      setSavedProject(state.project);
      setActivePath((prev) =>
        state.project.files[prev] !== undefined ? prev : state.project.entry,
      );
      hasCompiledRef.current = false;
    };
    import.meta.hot.on('dashboard-changed', reloadFromDisk);
    return () => import.meta.hot?.off('dashboard-changed', reloadFromDisk);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (!isDevPreview && mode !== 'edit' && hasCompiledRef.current) return;

    const delay = !isDevPreview && mode === 'edit' ? 300 : 0;
    const handle = setTimeout(() => {
      try {
        const invalidate = fullRebuildRef.current
          ? 'all'
          : (changedPathRef.current ?? undefined);
        fullRebuildRef.current = false;
        changedPathRef.current = null;

        const Compiled = compileProject(project, invalidate);
        setDashboard(() => Compiled);
        setVersion((v) => v + 1);
        setError(null);
        hasCompiledRef.current = true;
      } catch (err) {
        setError((err as Error).message);
      }
    }, delay);

    return () => clearTimeout(handle);
  }, [project, mode, loaded]);

  useEffect(() => {
    if (mobile && mode === 'edit') setMode('view');
  }, [mobile, mode]);

  const dirty =
    serialize(project) !== serialize(savedProject) ||
    JSON.stringify(workspace) !== JSON.stringify(savedWorkspace);

  const projectName = workspace?.projects[boundProjectId]?.name ?? boundProjectId;
  const canDelete = workspace ? Object.keys(workspace.projects).length > 1 : false;

  const createProject = useCallback(
    async (name: string) => {
      if (!workspace) return;
      const base = dirty
        ? savedWorkspace!
        : withActiveProject(workspace, boundProjectId, project);
      const { workspace: withNew, id: newId } = createWorkspaceProject(
        base,
        name,
        blankProject(),
      );
      const nextWs: Workspace = { ...withNew, activeId: boundProjectId };
      try {
        await saveWorkspace(nextWs);
        setWorkspace(nextWs);
        setSavedWorkspace(nextWs);
        setError(null);
        if (!localMode) {
          navigateToProjectPanel(newId);
        }
      } catch (err) {
        setError(`Erstellen fehlgeschlagen: ${(err as Error).message}`);
      }
    },
    [workspace, boundProjectId, project, dirty, savedWorkspace, localMode],
  );

  const renameProject = useCallback(
    async (name: string) => {
      if (!workspace) return;
      const base = dirty
        ? savedWorkspace!
        : withActiveProject(workspace, boundProjectId, project);
      const nextWs = renameWorkspaceProject(base, boundProjectId, name);
      try {
        await saveWorkspace(nextWs);
        setWorkspace(nextWs);
        setSavedWorkspace(nextWs);
        setError(null);
      } catch (err) {
        setError(`Umbenennen fehlgeschlagen: ${(err as Error).message}`);
      }
    },
    [workspace, boundProjectId, project, dirty, savedWorkspace],
  );

  const removeProject = useCallback(async () => {
    if (!workspace) return;
    const base = dirty
      ? savedWorkspace!
      : withActiveProject(workspace, boundProjectId, project);
    const nextWs = deleteWorkspaceProject(base, boundProjectId);
    if (!nextWs) return;
    try {
      await saveWorkspace(nextWs);
      setWorkspace(nextWs);
      setSavedWorkspace(nextWs);
      setProject(DEFAULT_PROJECT);
      setSavedProject(DEFAULT_PROJECT);
      setMode('view');
      fullRebuildRef.current = true;
      hasCompiledRef.current = false;
      setError('Dashboard gelöscht — wähle einen anderen Sidebar-Eintrag.');
    } catch (err) {
      setError(`Löschen fehlgeschlagen: ${(err as Error).message}`);
    }
  }, [workspace, boundProjectId, project, dirty, savedWorkspace]);

  const save = useCallback(async () => {
    if (!workspace) return;
    try {
      await saveStudioState(workspace, boundProjectId, project);
      const merged = withActiveProject(workspace, boundProjectId, project);
      setWorkspace(merged);
      setSavedWorkspace(merged);
      setSavedProject(project);
      setError(null);
    } catch (err) {
      setError(`Speichern fehlgeschlagen: ${(err as Error).message}`);
    }
  }, [workspace, boundProjectId, project]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (mode === 'edit') void save();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [save, mode]);

  const setActiveContent = useCallback(
    (content: string) => {
      changedPathRef.current = activePath;
      setProject((p) => ({ ...p, files: { ...p.files, [activePath]: content } }));
    },
    [activePath],
  );

  const changeFiles = useCallback(
    (files: Record<string, string>, nextActive?: string) => {
      fullRebuildRef.current = true;
      clearCompileCache();
      setProject((p) => ({ ...p, files }));
      if (nextActive) setActivePath(nextActive);
    },
    [],
  );

  const setEntry = useCallback((path: string) => {
    setProject((p) => ({ ...p, entry: path }));
  }, []);

  const openEditMode = useCallback(() => {
    void import('./studio-editor-module');
    setMode('edit');
  }, []);

  const stopShortcutsWhileTyping = useCallback((e: ReactKeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const target = e.target as HTMLElement | null;
    if (
      target &&
      (target.isContentEditable ||
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT')
    ) {
      e.stopPropagation();
    }
  }, []);

  if (!ready || !loaded || !workspace) {
    return (
      <div className="rd-center">
        <div className="rd-spinner" />
        <p>Verbinde mit Home Assistant…</p>
      </div>
    );
  }

  if (isDevPreview) {
    return (
      <div className="rd-studio is-viewing is-dev-preview" onKeyDown={stopShortcutsWhileTyping}>
        <div className="rd-studio__bar">
          <span className="rd-studio__title">Dev-Vorschau</span>
          {localMode && (
            <span className="rd-studio__local" title="Code in VS Code bearbeiten (./dashboard/)">
              📁 dashboard/
            </span>
          )}
          <button
            className={`rd-studio__btn ${entityBrowserOpen ? 'is-active' : ''}`}
            onClick={() => setEntityBrowserOpen((o) => !o)}
          >
            ⚡ Entities
          </button>
          <div
            className="rd-studio__theme-toggle"
            role="group"
            aria-label="Vorschau Light/Dark"
          >
            <button
              type="button"
              className={`rd-studio__btn ${!previewDark ? 'is-active' : ''}`}
              aria-pressed={!previewDark}
              onClick={() => setPreviewDarkMode(false)}
            >
              ☀ Light
            </button>
            <button
              type="button"
              className={`rd-studio__btn ${previewDark ? 'is-active' : ''}`}
              aria-pressed={previewDark}
              onClick={() => setPreviewDarkMode(true)}
            >
              🌙 Dark
            </button>
          </div>
          <span
            className={`rd-studio__status ${error ? 'is-error' : 'is-ok'}`}
            title={error ?? 'Vorschau aktuell'}
          >
            {error ? '● Fehler' : '● Live'}
          </span>
          <span className="rd-studio__spacer" />
          <span className="rd-studio__hint">VS Code · Snippet kopieren und einfügen</span>
        </div>
        <div className="rd-studio__preview rd-studio__preview--full">
          <Preview Dashboard={Dashboard} version={version} onRuntimeError={setError} />
          {error && (
            <div className="rd-studio__error">
              <pre>{error}</pre>
            </div>
          )}
        </div>
        {entityBrowserOpen && (
          <Suspense fallback={null}>
            <DevEntityInserter
              copyToClipboard
              onClose={() => setEntityBrowserOpen(false)}
            />
          </Suspense>
        )}
      </div>
    );
  }

  const editing = mode === 'edit';

  return (
    <div
      className={`rd-studio ${editing ? 'is-editing' : 'is-viewing'}`}
      onKeyDown={stopShortcutsWhileTyping}
    >
      <StudioToolbar
        mobile={mobile}
        projectName={projectName}
        hasWorkspace={Boolean(workspace)}
        canDelete={canDelete}
        editing={editing}
        dirty={dirty}
        localMode={localMode}
        error={error}
        inserterOpen={inserterOpen}
        authorDebug={authorDebug}
        debugActive={debugActive}
        onCreate={(name) => void createProject(name)}
        onRename={(name) => void renameProject(name)}
        onDelete={() => void removeProject()}
        onSave={() => void save()}
        onToggleInserter={() => setInserterOpen((o) => !o)}
        onToggleDebug={() => setAuthorDebug(!authorDebug)}
        onView={() => setMode('view')}
        onEdit={openEditMode}
      />

      {mode === 'view' ? (
        <div className="rd-studio__preview rd-studio__preview--full">
          <Preview Dashboard={Dashboard} version={version} onRuntimeError={setError} />
          {error && (
            <div className="rd-studio__error">
              <pre>{error}</pre>
            </div>
          )}
        </div>
      ) : (
        <Suspense
          fallback={
            <div className="rd-center">
              <div className="rd-spinner" />
              <p>Editor wird geladen…</p>
            </div>
          }
        >
          <StudioEditorLayout
            project={project}
            activePath={activePath}
            splitPct={splitPct}
            splitRef={splitRef}
            inserterOpen={inserterOpen}
            onCloseInserter={() => setInserterOpen(false)}
            Dashboard={Dashboard}
            version={version}
            error={error}
            onRuntimeError={setError}
            onSelectPath={setActivePath}
            onChangeFiles={changeFiles}
            onSetEntry={setEntry}
            onContentChange={setActiveContent}
            onDividerPointerDown={startDrag}
          />
        </Suspense>
      )}
    </div>
  );
}
