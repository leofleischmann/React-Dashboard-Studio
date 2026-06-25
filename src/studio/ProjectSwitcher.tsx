import {
  createWorkspaceProject,
  deleteWorkspaceProject,
  renameWorkspaceProject,
  type Workspace,
} from './workspace';

type Props = {
  workspace: Workspace;
  disabled?: boolean;
  onSwitch: (id: string) => void;
  onCreate: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
};

export function ProjectSwitcher({
  workspace,
  disabled,
  onSwitch,
  onCreate,
  onRename,
  onDelete,
}: Props) {
  const ids = Object.keys(workspace.projects).sort((a, b) => {
    const an = workspace.projects[a].name;
    const bn = workspace.projects[b].name;
    return an.localeCompare(bn, 'de');
  });

  const handleCreate = () => {
    const name = window.prompt('Name des neuen Dashboards:', 'Neues Dashboard');
    if (!name?.trim()) return;
    onCreate(name.trim());
  };

  const handleRename = () => {
    const id = workspace.activeId;
    const current = workspace.projects[id]?.name ?? id;
    const name = window.prompt('Anzeigename ändern:', current);
    if (!name?.trim() || name.trim() === current) return;
    onRename(id, name.trim());
  };

  const handleDelete = () => {
    const id = workspace.activeId;
    const name = workspace.projects[id]?.name ?? id;
    if (ids.length <= 1) {
      window.alert('Das letzte Dashboard kann nicht gelöscht werden.');
      return;
    }
    if (!window.confirm(`Dashboard „${name}“ (${id}/) wirklich löschen?`)) return;
    onDelete(id);
  };

  return (
    <div className="rd-project-switcher">
      <label className="rd-project-switcher__label" htmlFor="rd-project-select">
        Dashboard
      </label>
      <select
        id="rd-project-select"
        className="rd-project-switcher__select"
        value={workspace.activeId}
        disabled={disabled}
        onChange={(e) => onSwitch(e.target.value)}
      >
        {ids.map((id) => (
          <option key={id} value={id}>
            {workspace.projects[id].name}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="rd-studio__btn rd-project-switcher__btn"
        disabled={disabled}
        title="Neues Dashboard"
        onClick={handleCreate}
      >
        + Neu
      </button>
      <button
        type="button"
        className="rd-studio__btn rd-project-switcher__btn"
        disabled={disabled}
        title="Anzeigename umbenennen"
        onClick={handleRename}
      >
        Umbenennen
      </button>
      <button
        type="button"
        className="rd-studio__btn rd-project-switcher__btn"
        disabled={disabled || ids.length <= 1}
        title="Aktives Dashboard löschen"
        onClick={handleDelete}
      >
        Löschen
      </button>
    </div>
  );
}
