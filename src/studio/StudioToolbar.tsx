import { DashboardActions } from './DashboardActions';

function toggleHaSidebar(target: EventTarget): void {
  target.dispatchEvent(
    new CustomEvent('hass-toggle-menu', { bubbles: true, composed: true }),
  );
}

export interface StudioToolbarProps {
  mobile: boolean;
  projectName: string;
  hasWorkspace: boolean;
  canDelete: boolean;
  editing: boolean;
  dirty: boolean;
  localMode: boolean;
  error: string | null;
  inserterOpen: boolean;
  authorDebug: boolean;
  debugActive: boolean;
  onCreate: (name: string) => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onSave: () => void;
  onToggleInserter: () => void;
  onToggleDebug: () => void;
  onView: () => void;
  onEdit: () => void;
}

/** The Studio top bar (project actions, save/inserter/debug, view ⇄ edit). */
export function StudioToolbar({
  mobile,
  projectName,
  hasWorkspace,
  canDelete,
  editing,
  dirty,
  localMode,
  error,
  inserterOpen,
  authorDebug,
  debugActive,
  onCreate,
  onRename,
  onDelete,
  onSave,
  onToggleInserter,
  onToggleDebug,
  onView,
  onEdit,
}: StudioToolbarProps) {
  return (
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

      <span className="rd-studio__title">{projectName}</span>

      {hasWorkspace && !mobile && (
        <DashboardActions
          projectName={projectName}
          canDelete={canDelete}
          disabled={editing && dirty}
          onCreate={onCreate}
          onRename={onRename}
          onDelete={onDelete}
        />
      )}

      {localMode && (
        <span className="rd-studio__local" title="Projekt aus ./dashboard/ (VS Code)">
          📁 dashboard/
        </span>
      )}

      {editing && (
        <>
          <button
            className="rd-studio__btn is-primary"
            onClick={onSave}
            disabled={!dirty}
          >
            {dirty ? 'Speichern' : 'Gespeichert ✓'}
          </button>
          <span className="rd-studio__hint">Strg/⌘ + S</span>
          <button
            className={`rd-studio__btn ${inserterOpen ? 'is-active' : ''}`}
            onClick={onToggleInserter}
          >
            ⚡ Sensor / Aktion
          </button>
          <button
            type="button"
            className={`rd-studio__btn ${authorDebug ? 'is-active' : ''}`}
            title={
              debugActive
                ? 'db.log-Ausgabe aktiv (dein Toggle)'
                : 'db.log aus — Toggle an, oder in Integration-Optionen Debug-Logs aktivieren'
            }
            onClick={onToggleDebug}
          >
            🐞 Debug
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
        <button className="rd-studio__btn" onClick={onView}>
          ◀ Ansicht
        </button>
      ) : (
        !mobile && (
          <button
            className="rd-studio__edit"
            title="Dashboard bearbeiten"
            onClick={onEdit}
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
  );
}
