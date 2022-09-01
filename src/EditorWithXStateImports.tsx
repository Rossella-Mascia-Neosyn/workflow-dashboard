import Editor, { Monaco, OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { useEffect, useRef } from 'react';
import { themes } from './editor-themes';
import { localCache } from './localCache';
import { prettierLoader } from './prettier';
import { SpinnerWithText } from './components/SpinnerWithText/SpinnerWithText';
import { useEditorTheme } from './themeContext';

/**
 * CtrlCMD + Enter => format => update chart
 * Click on update chart button => update chart
 * Click on save/update => save/update to registry
 * CtrlCMD + S => format => save/update to registry
 */

interface EditorWithXStateImportsProps {
  onChange?: (text: string) => void;
  onMount?: OnMount;
  onSave?: () => void;
  onFormat?: () => void;
  value: string;
}

// based on the logic here: https://github.com/microsoft/TypeScript-Website/blob/103f80e7490ad75c34917b11e3ebe7ab9e8fc418/packages/sandbox/src/index.ts
const withTypeAcquisition = (
  editor: editor.IStandaloneCodeEditor,
  monaco: Monaco,
): editor.IStandaloneCodeEditor => editor;

export const EditorWithXStateImports = (
  props: EditorWithXStateImportsProps,
) => {
  const editorTheme = useEditorTheme();
  const editorRef = useRef<typeof editor | null>(null);
  const definedEditorThemes = useRef(new Set<string>());

  useEffect(() => {
    const editor = editorRef.current;
    const definedThemes = definedEditorThemes.current;
    const theme = editorTheme.theme;

    if (!editor || !definedThemes) {
      return;
    }

    if (!definedThemes.has(theme)) {
      editor.defineTheme(theme, themes[theme]);
    }
    editor.setTheme(theme);
    localCache.saveEditorTheme(editorTheme.theme);
  }, [editorTheme.theme]);

  return (
    <Editor
      defaultPath="main.json"
      defaultLanguage="json"
      value={props.value}
      options={{
        minimap: { enabled: false },
        tabSize: 2,
        glyphMargin: true,
        //monaco-disabled
        readOnly: false,
      }}
      loading={<SpinnerWithText text="Preparing the editor" />}
      onChange={(text) => {
        if (typeof text === 'string') {
          props.onChange?.(text);
        }
      }}
      theme="vs-dark"
      onMount={async (editor, monaco) => {
        editorRef.current = monaco.editor;
        const theme = editorTheme.theme;
        monaco.editor.defineTheme(theme, themes[theme]);
        monaco.editor.setTheme(theme);

        // Prettier to format
        // Ctrl/CMD + Enter to visualize
        editor.addAction({
          id: 'format',
          label: 'Format',
          keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
          run: (editor) => {
            editor.getAction('editor.action.formatDocument').run();
          },
        });

        monaco.languages.registerDocumentFormattingEditProvider('json', {
          provideDocumentFormattingEdits: async (model) => {
            try {
              return [
                {
                  text: await prettierLoader.format(editor.getValue()),
                  range: model.getFullModelRange(),
                },
              ];
            } catch (err) {
              console.error(err);
            } finally {
              props.onFormat?.();
            }
          },
        });

        // Ctrl/CMD + S to save/update to registry
        editor.addAction({
          id: 'save',
          label: 'Save',
          keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
          run: () => {
            props.onSave?.();
            editor.getAction('editor.action.formatDocument').run();
          },
        });

        const wrappedEditor = withTypeAcquisition(editor, monaco);
        props.onMount?.(wrappedEditor, monaco);
      }}
    />
  );
};

export default EditorWithXStateImports;
