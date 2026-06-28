import { useState, type DragEvent as ReactDragEvent } from 'react';
import { blankProject, newFileTemplate } from './project';
import { downloadZip } from './zip';
import { basename, folderPrefix, normalize, pathsInFolder, remapDirPath } from './filePaths';
import { buildTree, type TreeNode } from './fileTree';

export function FilePanel({
  files,
  entry,
  activePath,
  onSelect,
  onChangeFiles,
  onSetEntry,
}: {
  files: Record<string, string>;
  entry: string;
  activePath: string;
  onSelect: (path: string) => void;
  onChangeFiles: (files: Record<string, string>, nextActive?: string) => void;
  onSetEntry: (path: string) => void;
}) {
  const [dropping, setDropping] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

  const toggleDir = (path: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });

  // Drag files from your computer onto the panel to add or replace them. A drop
  // whose name matches exactly one existing file replaces that file ("austauschen");
  // anything else is added as a new file ("hinzufügen").
  const importFiles = async (list: FileList | null) => {
    const incoming = Array.from(list ?? []).filter((f) => /\.(tsx?|jsx?)$/.test(f.name));
    if (incoming.length === 0) {
      if (list && list.length) {
        window.alert('Bitte nur Code-Dateien ablegen (.tsx, .ts, .jsx, .js).');
      }
      return;
    }
    const next = { ...files };
    let active = activePath;
    let changed = false;
    for (const file of incoming) {
      let path = normalize(file.name);
      if (next[path] === undefined) {
        const twins = Object.keys(next).filter((p) => basename(p) === basename(path));
        if (twins.length === 1) path = twins[0];
      }
      if (next[path] !== undefined && !window.confirm(`"${path}" mit der abgelegten Datei ersetzen?`)) {
        continue;
      }
      next[path] = await file.text();
      active = path;
      changed = true;
    }
    if (changed) onChangeFiles(next, active);
  };

  const onDrop = (e: ReactDragEvent) => {
    e.preventDefault();
    setDropping(false);
    void importFiles(e.dataTransfer.files);
  };

  const onDragOver = (e: ReactDragEvent) => {
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
      setDropping(true);
    }
  };

  const onDragLeave = (e: ReactDragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDropping(false);
  };

  const addFile = () => {
    // Include a folder in the path to create one, e.g. "components/Card.tsx".
    const input = window.prompt('Neue Datei (Ordner per Pfad, z. B. components/Card.tsx):');
    if (!input) return;
    const path = normalize(input);
    if (files[path]) {
      window.alert(`"${path}" gibt es schon.`);
      return;
    }
    onChangeFiles({ ...files, [path]: newFileTemplate(path) }, path);
  };

  const renameFile = (oldPath: string) => {
    const input = window.prompt('Datei umbenennen (Pfad = verschieben):', oldPath);
    if (!input) return;
    const path = normalize(input);
    if (path === oldPath) return;
    if (files[path]) {
      window.alert(`"${path}" gibt es schon.`);
      return;
    }
    const next: Record<string, string> = {};
    for (const [k, v] of Object.entries(files)) next[k === oldPath ? path : k] = v;
    onChangeFiles(next, activePath === oldPath ? path : activePath);
    if (entry === oldPath) onSetEntry(path);
  };

  const deleteFile = (path: string) => {
    if (Object.keys(files).length <= 1) {
      window.alert('Die letzte Datei kann nicht gelöscht werden.');
      return;
    }
    if (path === entry) {
      window.alert('Die Einstiegsdatei kann nicht gelöscht werden. Lege zuerst eine andere als Start fest.');
      return;
    }
    if (!window.confirm(`"${path}" löschen?`)) return;
    const next = { ...files };
    delete next[path];
    const nextActive = activePath === path ? Object.keys(next).sort()[0] : activePath;
    onChangeFiles(next, nextActive);
  };

  const renameFolder = (oldDirPath: string) => {
    const input = window.prompt('Ordner umbenennen (Pfad):', oldDirPath);
    if (!input) return;
    const newDirPath = input.trim().replace(/^\/+|\/+$/g, '');
    if (!newDirPath || newDirPath === oldDirPath) return;

    const affected = pathsInFolder(files, oldDirPath);
    if (affected.length === 0) return;

    for (const path of affected) {
      const newPath = remapDirPath(path, oldDirPath, newDirPath);
      if (newPath !== path && files[newPath] !== undefined) {
        window.alert(`"${newPath}" gibt es schon.`);
        return;
      }
    }

    const prefix = folderPrefix(oldDirPath);
    const next: Record<string, string> = {};
    for (const [k, v] of Object.entries(files)) {
      next[k.startsWith(prefix) ? remapDirPath(k, oldDirPath, newDirPath) : k] = v;
    }

    const nextActive = activePath.startsWith(prefix)
      ? remapDirPath(activePath, oldDirPath, newDirPath)
      : activePath;
    if (entry.startsWith(prefix)) onSetEntry(remapDirPath(entry, oldDirPath, newDirPath));

    setCollapsed((prev) => {
      const next = new Set<string>();
      for (const p of prev) {
        next.add(remapDirPath(p, oldDirPath, newDirPath));
      }
      return next;
    });

    onChangeFiles(next, nextActive);
  };

  const deleteFolder = (dirPath: string) => {
    const prefix = folderPrefix(dirPath);
    const toDelete = pathsInFolder(files, dirPath);
    if (toDelete.length === 0) return;

    const remaining = Object.keys(files).filter((p) => !p.startsWith(prefix));
    if (remaining.length === 0) {
      window.alert('Der Ordner kann nicht gelöscht werden – mindestens eine Datei muss bleiben.');
      return;
    }
    if (entry.startsWith(prefix)) {
      window.alert(
        'Der Ordner enthält die Einstiegsdatei. Lege zuerst eine andere Datei als Start fest.',
      );
      return;
    }
    if (
      !window.confirm(
        `Ordner "${dirPath}" mit ${toDelete.length} Datei(en) löschen?\n\n${toDelete.join('\n')}`,
      )
    )
      return;

    const next = { ...files };
    for (const p of toDelete) delete next[p];

    const nextActive = activePath.startsWith(prefix) ? remaining.sort()[0] : activePath;
    setCollapsed((prev) => {
      const next = new Set<string>();
      for (const p of prev) {
        if (p !== dirPath && !p.startsWith(prefix)) next.add(p);
      }
      return next;
    });

    onChangeFiles(next, nextActive);
  };

  const downloadAll = () => downloadZip(files);

  const deleteAll = () => {
    if (
      !window.confirm(
        'Wirklich ALLE Dateien löschen? Das lässt sich nicht rückgängig machen.\n' +
          'Tipp: vorher „⬇ ZIP" zum Sichern.',
      )
    )
      return;
    const fresh = blankProject();
    onChangeFiles(fresh.files, fresh.entry);
    onSetEntry(fresh.entry);
  };

  const renderNodes = (nodes: TreeNode[], depth: number) =>
    nodes.map((node) => {
      const indent = { paddingLeft: 6 + depth * 14 };
      if (node.kind === 'dir') {
        const open = !collapsed.has(node.path);
        return (
          <li key={`d:${node.path}`}>
            <div
              className="rd-files__dir"
              style={indent}
              onClick={() => toggleDir(node.path)}
              title={node.path}
            >
              <span className="rd-files__caret">{open ? '▾' : '▸'}</span>
              <span className="rd-files__dirname">{node.name}</span>
              <span className="rd-files__actions">
                <button
                  className="rd-files__icon"
                  title="Ordner umbenennen"
                  onClick={(e) => {
                    e.stopPropagation();
                    renameFolder(node.path);
                  }}
                >
                  ✎
                </button>
                <button
                  className="rd-files__icon"
                  title="Ordner löschen"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteFolder(node.path);
                  }}
                >
                  ✕
                </button>
              </span>
            </div>
            {open && (
              <ul className="rd-files__sublist">{renderNodes(node.children, depth + 1)}</ul>
            )}
          </li>
        );
      }
      const path = node.path;
      return (
        <li
          key={`f:${path}`}
          className={`rd-files__item ${path === activePath ? 'is-active' : ''}`}
          style={indent}
          onClick={() => onSelect(path)}
        >
          <span className="rd-files__name" title={path}>
            {node.name}
          </span>
          <span className="rd-files__actions">
            <button
              className={`rd-files__entry ${path === entry ? 'is-entry' : ''}`}
              title={path === entry ? 'Einstiegsdatei' : 'Als Einstieg festlegen'}
              onClick={(e) => {
                e.stopPropagation();
                onSetEntry(path);
              }}
            >
              ⌂
            </button>
            <button
              className="rd-files__icon"
              title="Umbenennen"
              onClick={(e) => {
                e.stopPropagation();
                renameFile(path);
              }}
            >
              ✎
            </button>
            <button
              className="rd-files__icon"
              title="Löschen"
              onClick={(e) => {
                e.stopPropagation();
                deleteFile(path);
              }}
            >
              ✕
            </button>
          </span>
        </li>
      );
    });

  return (
    <div
      className={`rd-files ${dropping ? 'is-dropping' : ''}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="rd-files__head">
        <span>Dateien</span>
        <button
          className="rd-files__add"
          title="Neue Datei (Ordner per Pfad, z. B. components/Card.tsx)"
          onClick={addFile}
        >
          ＋
        </button>
      </div>

      <ul className="rd-files__list">{renderNodes(buildTree(Object.keys(files)), 0)}</ul>

      <div className="rd-files__foot">
        <button className="rd-files__tool" title="Alle Dateien als ZIP herunterladen" onClick={downloadAll}>
          ⬇ ZIP
        </button>
        <button
          className="rd-files__tool is-danger"
          title="Alle Dateien löschen (Neustart)"
          onClick={deleteAll}
        >
          ✕ Alle
        </button>
      </div>
      <p className="rd-files__drophint">Dateien hierher ziehen · Ordner per Pfad anlegen</p>
    </div>
  );
}
