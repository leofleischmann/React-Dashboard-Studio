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
import { useHassReady, useIsMobile } from '../sdk/hass/hooks';
import { projectUsesDefaultDashboardStyles } from '../lib/projectUsesDefaultStyles';
import { syncDefaultDashboardStyles } from '../mount';
import { useRenderRoot } from './shadowRoot';
import { clearCompileCache, compileProject } from './compile';
import { loadProject, isLocalDashboardMode, saveProject, subscribeProjectReset } from './storage';
import { DEFAULT_PROJECT, type Project } from './project';
import { Preview } from './Preview';

const loadEditorModule = () => import('./studio-editor-module');
const StudioEditorLayout = lazy(() => loadEditorModule());
const DevEntityInserter = lazy(() =>
  loadEditorModule().then((m) => ({ default: m.DevEntityInserter })),
);

type Mode = 'view' | 'edit';

const serialize = (p: Project) => JSON.stringify({ e: p.entry, f: p.files });

/** `npm run dev` — preview only; code is edited in VS Code (./dashboard/). */
const isDevPreview = import.meta.env.DEV;

function toggleHaSidebar(target: EventTarget): void {
  target.dispatchEvent(
    new CustomEvent('hass-toggle-menu', { bubbles: true, composed: true }),
  );
}

export default function Studio() {
  const ready = useHassReady();
  const mobile = useIsMobile();

  const [project, setProject] = useState<Project>(DEFAULT_PROJECT);
  const [savedProject, setSavedProject] = useState<Project>(DEFAULT_PROJECT);
  const [activePath, setActivePath] = useState<string>(DEFAULT_PROJECT.entry);
  const [loaded, setLoaded] = useState(false);
  const [localMode, setLocalMode] = useState(false);
  const [mode, setMode] = useState<Mode>('view');
  const [inserterOpen, setInserterOpen] = useState(false);
  const [entityBrowserOpen, setEntityBrowserOpen] = useState(false);

  const [Dashboard, setDashboard] = useState<ComponentType | null>(null);
  const [version, setVersion] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [splitPct, setSplitPct] = useState(46);

  const splitRef = useRef<HTMLDivElement>(null);
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
    if (!ready || loaded) return;
    let cancelled = false;
    loadProject().then((p) => {
      if (cancelled) return;
      const fromLocal = isLocalDashboardMode();
      setLocalMode(fromLocal);
      setProject(p);
      setSavedProject(p);
      setActivePath(p.files[p.entry] !== undefined ? p.entry : Object.keys(p.files)[0]);
      setLoaded(true);
      fullRebuildRef.current = true;
    });
    return () => {
      cancelled = true;
    };
  }, [ready, loaded]);

  useEffect(() => {
    if (!ready || !loaded || localMode) return;
    return subscribeProjectReset(() => {
      fullRebuildRef.current = true;
      clearCompileCache();
      setProject(DEFAULT_PROJECT);
      setSavedProject(DEFAULT_PROJECT);
      setActivePath(DEFAULT_PROJECT.entry);
      setMode('view');
      hasCompiledRef.current = false;
    });
  }, [ready, loaded, localMode]);

  useEffect(() => {
    if (!import.meta.hot) return;
    const reloadFromDisk = async () => {
      if (!isLocalDashboardMode()) return;
      const p = await loadProject();
      fullRebuildRef.current = true;
      clearCompileCache();
      setProject(p);
      setSavedProject(p);
      setActivePath((prev) => (p.files[prev] !== undefined ? prev : p.entry));
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

  const dirty = serialize(project) !== serialize(savedProject);

  const save = useCallback(async () => {
    try {
      await saveProject(project);
      setSavedProject(project);
      setError(null);
    } catch (err) {
      setError(`Speichern fehlgeschlagen: ${(err as Error).message}`);
    }
  }, [project]);

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

  const dragging = useRef(false);
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      const rect = splitRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0) return;
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setSplitPct(Math.min(75, Math.max(25, pct)));
    };
    const onUp = () => (dragging.current = false);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, []);

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

  if (!ready || !loaded) {
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
      <div className="rd-studio__bar">
        {mobile && (
          <button
            className="rd-studio__menu"
            title="Seitenleiste ein-/ausblenden"
            aria-label="Seitenleiste ein-/ausblenden"
            onClick={(e) => toggleHaSidebar(e.currentTarget)}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path
                fill="currentColor"
                d="M3 6h18v2H3V6m0 5h18v2H3v-2m0 5h18v2H3v-2Z"
              />
            </svg>
          </button>
        )}

        <span className="rd-studio__title">Dashboard Studio</span>

        {localMode && (
          <span className="rd-studio__local" title="Projekt aus ./dashboard/ (VS Code)">
            📁 dashboard/
          </span>
        )}

        {editing && (
          <>
            <button
              className="rd-studio__btn is-primary"
              onClick={() => void save()}
              disabled={!dirty}
            >
              {dirty ? 'Speichern' : 'Gespeichert ✓'}
            </button>
            <span className="rd-studio__hint">Strg/⌘ + S</span>
            <button
              className={`rd-studio__btn ${inserterOpen ? 'is-active' : ''}`}
              onClick={() => setInserterOpen((o) => !o)}
            >
              ⚡ Sensor / Aktion
            </button>
            <span
              className={`rd-studio__status ${error ? 'is-error' : 'is-ok'}`}
              title={error ?? 'Vorschau aktuell'}
            >
              {error ? '● Fehler' : '● Live'}
            </span>
          </>
        )}

        <span className="rd-studio__spacer" />

        {editing ? (
          <button className="rd-studio__btn" onClick={() => setMode('view')}>
            ◀ Ansicht
          </button>
        ) : (
          !mobile && (
            <button
              className="rd-studio__edit"
              title="Dashboard bearbeiten"
              onClick={openEditMode}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.84 1.83 3.75 3.75M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25Z"
                />
              </svg>
              <span>Bearbeiten</span>
            </button>
          )
        )}
      </div>

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
            onDividerPointerDown={() => (dragging.current = true)}
          />
        </Suspense>
      )}
    </div>
  );
}
