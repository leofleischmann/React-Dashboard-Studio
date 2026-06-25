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
import type { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { useHassReady, useIsMobile } from '../sdk/hass/hooks';
import { clearCompileCache, compileProject } from './compile';
import { loadProject, isLocalDashboardMode, saveProject, subscribeProjectReset } from './storage';
import { DEFAULT_PROJECT, type Project } from './project';
import { availableModules } from '../sdk/runtime';
import { Preview } from './Preview';
import { FilePanel } from './FilePanel';
import { EntityInserter } from './EntityInserter';

const Editor = lazy(() =>
  import('./Editor').then((m) => ({ default: m.Editor })),
);

type Mode = 'view' | 'edit';

const serialize = (p: Project) => JSON.stringify({ e: p.entry, f: p.files });

/** `npm run dev` — preview only; code is edited in VS Code (./dashboard/). */
const isDevPreview = import.meta.env.DEV;

/**
 * Ask Home Assistant to toggle its sidebar. On mobile, custom panels render
 * without HA's own header, so the sidebar is otherwise unreachable — we provide
 * the hamburger that opens it. On desktop HA always shows the sidebar (or its
 * rail) with its own toggle, so we hide ours there to avoid a duplicate button.
 * The event is `composed`, so it crosses our shadow boundary up to
 * <home-assistant>, which handles it.
 */
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

  const cmRef = useRef<ReactCodeMirrorRef>(null);
  const splitRef = useRef<HTMLDivElement>(null);
  const changedPathRef = useRef<string | null>(null);
  const fullRebuildRef = useRef(false);
  const hasCompiledRef = useRef(false);

  // Load saved project from HA once connected.
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

  // Integration options → „Standard wiederherstellen“ clears frontend user_data.
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

  // VS Code / sync: reload when dashboard/ files change on disk.
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

  // Recompile on project changes (debounced in edit mode).
  // Dev preview recompiles on every ./dashboard/ change; production view mode only once.
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

  // The code editor is desktop-only. If we end up on a mobile layout (e.g. the
  // window was resized, or HA reports narrow), drop back to the live view.
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

  // Ctrl/Cmd+S to save.
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

  // Drag-to-resize the editor/preview split. Measured relative to the split
  // container (not the window): on desktop the panel sits to the right of HA's
  // sidebar, so the window origin is not the container origin.
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

  // ── File / editor handlers ──
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

  const insertSnippet = useCallback((text: string) => {
    const view = cmRef.current?.view;
    if (!view) return;
    const { from, to } = view.state.selection.main;
    view.dispatch({
      changes: { from, to, insert: text },
      selection: { anchor: from + text.length },
    });
    view.focus();
  }, []);

  // Home Assistant registers single-key shortcuts (a, c, e, m, …) on document.
  // Because we render inside HA's shadow DOM, keydown targets are retargeted to
  // our host element, so HA no longer sees that the user is typing in a field and
  // fires the shortcut mid-edit (e.g. "a" opens Assist, "m" a My link). Keep
  // plain keystrokes that originate from an editable element (the code editor,
  // the entity search) inside the panel; let modifier combos through so Ctrl/⌘+S
  // still saves and global shortcuts keep working when nothing is focused.
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
          <EntityInserter
            copyToClipboard
            onClose={() => setEntityBrowserOpen(false)}
          />
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
        {/* Sidebar toggle only where HA's own is out of reach (mobile). On
            desktop HA's sidebar/rail is always present, so ours would duplicate. */}
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
          <button
            className="rd-studio__btn"
            onClick={() => setMode('view')}
          >
            ◀ Ansicht
          </button>
        ) : (
          // Desktop only: a discreet, ghost-styled entry point into the editor.
          !mobile && (
            <button
              className="rd-studio__edit"
              title="Dashboard bearbeiten"
              onClick={() => setMode('edit')}
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
        <div className="rd-studio__split" ref={splitRef}>
          <FilePanel
            files={project.files}
            entry={project.entry}
            activePath={activePath}
            onSelect={setActivePath}
            onChangeFiles={changeFiles}
            onSetEntry={setEntry}
          />

          <div className="rd-studio__editor" style={{ flex: `${splitPct} 1 0%` }}>
            <Suspense
              fallback={
                <div className="rd-studio__empty">Editor wird geladen…</div>
              }
            >
              <Editor
                ref={cmRef}
                value={project.files[activePath] ?? ''}
                onChange={setActiveContent}
              />
            </Suspense>
            <div className="rd-studio__modules">
              <code>{activePath}</code> · import aus:{' '}
              {availableModules.map((m) => `'${m}'`).join(', ')} · oder eigene
              Dateien (./…)
            </div>
          </div>

          <div
            className="rd-studio__divider"
            onPointerDown={() => (dragging.current = true)}
          />

          <div
            className="rd-studio__preview"
            style={{ flex: `${100 - splitPct} 1 0%` }}
          >
            <Preview Dashboard={Dashboard} version={version} onRuntimeError={setError} />
            {error && (
              <div className="rd-studio__error">
                <pre>{error}</pre>
              </div>
            )}
          </div>

          {inserterOpen && (
            <EntityInserter
              onInsert={insertSnippet}
              onClose={() => setInserterOpen(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}
