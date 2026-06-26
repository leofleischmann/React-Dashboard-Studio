type Props = {
  projectName: string;
  canDelete: boolean;
  disabled?: boolean;
  onCreate: (name: string) => void;
  onRename: (name: string) => void;
  onDelete: () => void;
};

/** Toolbar actions for the current sidebar dashboard (no project switcher). */
export function DashboardActions({
  projectName,
  canDelete,
  disabled,
  onCreate,
  onRename,
  onDelete,
}: Props) {
  const handleCreate = () => {
    const name = window.prompt('Name des neuen Dashboards:', 'Neues Dashboard');
    if (!name?.trim()) return;
    onCreate(name.trim());
  };

  const handleRename = () => {
    const name = window.prompt('Anzeigename ändern:', projectName);
    if (!name?.trim() || name.trim() === projectName) return;
    onRename(name.trim());
  };

  const handleDelete = () => {
    if (!canDelete) {
      window.alert('Das letzte Dashboard kann nicht gelöscht werden.');
      return;
    }
    if (!window.confirm(`Dashboard „${projectName}“ wirklich löschen?`)) return;
    onDelete();
  };

  return (
    <div className="rd-dashboard-actions">
      <button
        type="button"
        className="rd-studio__btn rd-dashboard-actions__btn"
        disabled={disabled}
        title="Neues Dashboard erstellen"
        onClick={handleCreate}
      >
        + Neu
      </button>
      <button
        type="button"
        className="rd-studio__btn rd-dashboard-actions__btn"
        disabled={disabled}
        title="Sidebar-Titel umbenennen"
        onClick={handleRename}
      >
        Umbenennen
      </button>
      <button
        type="button"
        className="rd-studio__btn rd-dashboard-actions__btn"
        disabled={disabled || !canDelete}
        title="Dieses Dashboard löschen"
        onClick={handleDelete}
      >
        Löschen
      </button>
    </div>
  );
}
