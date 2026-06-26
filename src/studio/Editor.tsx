import { forwardRef, useEffect, useRef } from 'react';
import CodeMirror, { type ReactCodeMirrorRef } from '@uiw/react-codemirror';
import type { EditorView } from '@codemirror/view';
import { javascript } from '@codemirror/lang-javascript';
import { entityAutocomplete } from './entityCompletion';
import { regionFolding, foldAllRegions } from './regionFold';
import { useRenderRoot } from './shadowRoot';

export const Editor = forwardRef<
  ReactCodeMirrorRef,
  { value: string; onChange: (next: string) => void; foldKey?: string }
>(function Editor({ value, onChange, foldKey }, ref) {
  // We're mounted inside the panel's shadow root; tell CodeMirror so it injects
  // its styles there (not document.head, which can't reach us) and resolves the
  // selection against the right tree.
  const root = useRenderRoot();
  const viewRef = useRef<EditorView | null>(null);

  // Collapse ejected #region blocks when a page is (re)opened — keyed on the
  // page, not the content, so folds aren't forced back closed while typing.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const id = setTimeout(() => foldAllRegions(view), 0);
    return () => clearTimeout(id);
  }, [foldKey]);

  return (
    <CodeMirror
      ref={ref}
      root={root}
      value={value}
      onChange={onChange}
      onCreateEditor={(view) => {
        viewRef.current = view;
        foldAllRegions(view);
      }}
      height="100%"
      theme="dark"
      extensions={[
        javascript({ jsx: true, typescript: true }),
        entityAutocomplete,
        regionFolding,
      ]}
      basicSetup={{
        lineNumbers: true,
        highlightActiveLine: true,
        bracketMatching: true,
        closeBrackets: true,
        autocompletion: true,
        indentOnInput: true,
        foldGutter: false,
      }}
      style={{ height: '100%', fontSize: 13 }}
    />
  );
});
