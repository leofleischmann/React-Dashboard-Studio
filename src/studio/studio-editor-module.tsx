import { useRef, type ComponentType, type RefObject } from 'react';
import type { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { availableModules } from '../sdk/runtime';
import { Editor } from './Editor';
import { EntityInserter } from './EntityInserter';
import { FilePanel } from './FilePanel';
import { Preview } from './Preview';
import { computeEjectChanges, type EjectInsert } from './ejectInsert';
import { foldAllRegions } from './regionFold';
import type { Project } from './project';

export type StudioEditorLayoutProps = {
  project: Project;
  activePath: string;
  splitPct: number;
  splitRef: RefObject<HTMLDivElement>;
  inserterOpen: boolean;
  onCloseInserter: () => void;
  Dashboard: ComponentType | null;
  version: number;
  error: string | null;
  onRuntimeError: (msg: string | null) => void;
  onSelectPath: (path: string) => void;
  onChangeFiles: (files: Record<string, string>, nextActive?: string) => void;
  onSetEntry: (path: string) => void;
  onContentChange: (content: string) => void;
  onDividerPointerDown: () => void;
};

/** Dev entity browser — same lazy chunk as the edit UI. */
export { EntityInserter as DevEntityInserter } from './EntityInserter';

export default function StudioEditorLayout({
  project,
  activePath,
  splitPct,
  splitRef,
  inserterOpen,
  onCloseInserter,
  Dashboard,
  version,
  error,
  onRuntimeError,
  onSelectPath,
  onChangeFiles,
  onSetEntry,
  onContentChange,
  onDividerPointerDown,
}: StudioEditorLayoutProps) {
  const cmRef = useRef<ReactCodeMirrorRef>(null);

  const insertSnippet = (text: string) => {
    const view = cmRef.current?.view;
    if (!view) return;
    const { from, to } = view.state.selection.main;
    view.dispatch({
      changes: { from, to, insert: text },
      selection: { anchor: from + text.length },
    });
    view.focus();
  };

  // Eject: copy the widget's real source into a folded #region block, drop the
  // usage tag at the cursor and merge the imports — then collapse the region.
  const ejectInsert = (eject: EjectInsert) => {
    const view = cmRef.current?.view;
    if (!view) return;
    const { from, to } = view.state.selection.main;
    const { changes, selection } = computeEjectChanges(
      view.state.doc.toString(),
      from,
      to,
      eject,
    );
    view.dispatch({ changes, selection: { anchor: selection } });
    foldAllRegions(view);
    view.focus();
  };

  return (
    <div className="rd-studio__split" ref={splitRef}>
      <FilePanel
        files={project.files}
        entry={project.entry}
        activePath={activePath}
        onSelect={onSelectPath}
        onChangeFiles={onChangeFiles}
        onSetEntry={onSetEntry}
      />

      <div className="rd-studio__editor" style={{ flex: `${splitPct} 1 0%` }}>
        <Editor
          ref={cmRef}
          value={project.files[activePath] ?? ''}
          onChange={onContentChange}
          foldKey={activePath}
        />
        <div className="rd-studio__modules">
          <code>{activePath}</code> · import aus:{' '}
          {availableModules.map((m) => `'${m}'`).join(', ')} · oder eigene Dateien (./…)
        </div>
      </div>

      <div className="rd-studio__divider" onPointerDown={onDividerPointerDown} />

      <div className="rd-studio__preview" style={{ flex: `${100 - splitPct} 1 0%` }}>
        <Preview Dashboard={Dashboard} version={version} onRuntimeError={onRuntimeError} />
        {error && (
          <div className="rd-studio__error">
            <pre>{error}</pre>
          </div>
        )}
      </div>

      {inserterOpen && (
        <EntityInserter
          onInsert={insertSnippet}
          onEject={ejectInsert}
          onClose={onCloseInserter}
        />
      )}
    </div>
  );
}
