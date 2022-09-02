import {
  Box,
  Button,
  Flex,
} from '@chakra-ui/react';
import type { Monaco } from '@monaco-editor/react';
import { useActor, useMachine, useSelector } from '@xstate/react';
import { editor, Range } from 'monaco-editor';
import React from 'react';
import { ActorRefFrom, assign, createMachine, DoneInvokeEvent, send, spawn } from 'xstate';
import { createModel } from 'xstate/lib/model';
// import { useAuth } from './authContext';
import SelectThemes from './components/SelectThemes/SelectThemes';
import { useGlobal } from './context/globalContext';
import EditorWithXStateImports from './EditorWithXStateImports';
import { handlerRemap } from './myUtils/handlerRemap';
import { notifMachine } from './notificationMachine';
import {
  getEditorValue,
  getShouldImmediateUpdate,
} from './sourceMachine';
import type { AnyStateMachine } from './types';
import { uniq } from './utils';

import BaseJson from './__tests__/jsonTest/init/baseInit.json';


function buildGistFixupImportsText(usedXStateGistIdentifiers: string[]) {
  const rootNames: string[] = [];
  let text = '';

  for (const identifier of usedXStateGistIdentifiers) {
    switch (identifier) {
      case 'raise':
        rootNames.push('actions');
        text += 'const { raise } = actions;\n';
        break;
      case 'XState':
        text += 'import * as XState from "xstate";\n';
        break;
      default:
        rootNames.push(identifier);
        break;
    }
  }

  if (rootNames.length) {
    // this uses `uniq` on the `rootNames` list because `actions` could be pushed into it while it was already in the list
    text = `import { ${uniq(rootNames).join(', ')} } from "xstate";\n${text}`;
  }

  return text;
}

class SyntaxError extends Error {
  range: Range;
  constructor(message: string, range: Range) {
    super(message);
    this.range = range;
  }

  get title() {
    return `SyntaxError at Line:${this.range.startLineNumber} Col:${this.range.endColumn}`;
  }

  toString() {
    return this.message;
  }
}

const editorPanelModel = createModel(
  {
    code: '',
    notifRef: undefined! as ActorRefFrom<typeof notifMachine>,
    monacoRef: null as Monaco | null,
    standaloneEditorRef: null as editor.IStandaloneCodeEditor | null,
    sourceRef: null as any,
    mainFile: 'main.ts',
    machines: null as AnyStateMachine[] | null,
    deltaDecorations: [] as string[],
  },
  {
    events: {
      COMPILE: () => ({}),
      EDITOR_READY: (
        monacoRef: Monaco,
        standaloneEditorRef: editor.IStandaloneCodeEditor,
      ) => ({ monacoRef, standaloneEditorRef }),
      UPDATE_MACHINE_PRESSED: () => ({}),
      EDITOR_ENCOUNTERED_ERROR: (message: string, title?: string) => ({
        message,
        title,
      }),
      EDITOR_CHANGED_VALUE: (code: string) => ({ code }),
    },
  },
);

const editorPanelMachine = editorPanelModel.createMachine(
  {
    entry: [assign({ notifRef: () => spawn(notifMachine) })],
    initial: 'booting',
    states: {
      booting: {
        initial: 'waiting_for_monaco',
        on: { EDITOR_CHANGED_VALUE: undefined },
        states: {
          waiting_for_monaco: {
            on: {
              EDITOR_READY: [
                {
                  // cond: 'isGist',
                  target: 'fixing_gist_imports',
                  actions: editorPanelModel.assign({
                    monacoRef: (_, e) => e.monacoRef,
                    standaloneEditorRef: (_, e) => e.standaloneEditorRef,
                  }),
                },
                {
                  target: 'done',
                  actions: editorPanelModel.assign({
                    monacoRef: (_, e) => e.monacoRef,
                    standaloneEditorRef: (_, e) => e.standaloneEditorRef,
                  }),
                },
              ],
            },
          },
          fixing_gist_imports: {
            invoke: {
              src: async (ctx) => {
                const monaco = ctx.monacoRef!;
                const uri = monaco.Uri.parse(ctx.mainFile);
                const getWorker =
                  await monaco.languages.typescript.getTypeScriptWorker();
                const tsWorker = await getWorker(uri);

                const usedXStateGistIdentifiers: string[] = await (
                  tsWorker as any
                ).queryXStateGistIdentifiers(uri.toString());

                if (usedXStateGistIdentifiers.length > 0) {
                  const fixupImportsText = buildGistFixupImportsText(
                    usedXStateGistIdentifiers,
                  );
                  const model = monaco.editor.getModel(uri)!;
                  const currentValue = model.getValue();
                  model.setValue(`${fixupImportsText}\n${currentValue}`);
                }
              },
              onDone: 'done',
              onError: {
                actions: ['broadcastError'],
              },
            },
          },
          done: {
            type: 'final',
          },
        },
        onDone: [
          {
            cond: (ctx) =>
              getShouldImmediateUpdate(ctx.sourceRef.getSnapshot()!),
            target: 'compiling',
          },
          { target: 'active' },
        ],
      },
      active: {},
      updating: {
        tags: ['visualizing'],
        entry: send('UPDATE_MACHINE_PRESSED'),
        always: 'active',
      },
      compiling: {
        tags: ['visualizing'],
        invoke: {
          src: async (ctx) => {
            debugger;
            let remap = handlerRemap(JSON.parse(ctx.code))
            const machine = createMachine(remap)
            let machines = [];
            machines.push(machine)
            return machines
          },
          onDone: {
            target: 'updating',
            actions: [
              assign({
                machines: (_, e: any) => {
                  return e.data
                }
              }),
            ],
          },
          onError: [
            {
              cond: 'isSyntaxError',
              target: 'active',
              actions: [
                'addDecorations',
                'scrollToLineWithError',
                'broadcastError',
              ],
            },
            {
              target: 'active',
              actions: ['broadcastError'],
            },
          ],
        },
      },
    },
    on: {
      EDITOR_CHANGED_VALUE: {
        actions: [
          editorPanelModel.assign({ code: (_, e) => e.code }),
          'onChangedCodeValue',
          'clearDecorations',
        ],
      },
      EDITOR_ENCOUNTERED_ERROR: {
        actions: send(
          (_, e) => ({
            type: 'BROADCAST',
            status: 'error',
            message: e.message,
          }),
          {
            to: (ctx) => ctx.notifRef,
          },
        ),
      },
      UPDATE_MACHINE_PRESSED: {
        actions: 'onChange',
      },
      COMPILE: 'compiling',
    },
  },
  {
    guards: {
      isSyntaxError: (_, e: any) => e.data instanceof SyntaxError,
    },
    actions: {
      broadcastError: send((_, e: any) => ({
        type: 'EDITOR_ENCOUNTERED_ERROR',
        title: e.data.title,
        message: e.data.message,
      })),
      addDecorations: assign({
        deltaDecorations: (ctx, e) => {
          const {
            data: { range },
          } = e as DoneInvokeEvent<{ message: string; range: Range }>;
          if (ctx.standaloneEditorRef) {
            // TODO: this Monaco API performs a side effect of clearing previous deltaDecorations while creating new decorations
            // Since XState reserves the right to assume assign actions are pure, think of a way to split the effect from assignment
            //@ts-ignore
            const newDecorations = ctx.standaloneEditorRef.deltaDecorations(
              ctx.deltaDecorations,
              [
                {
                  range,
                  options: {
                    isWholeLine: true,
                    glyphMarginClassName: 'editor__glyph-margin',
                    className: 'editor__error-content',
                  },
                },
              ],
            );
            return newDecorations;
          }
          return ctx.deltaDecorations;
        },
      }),
      clearDecorations: assign({
        deltaDecorations: (ctx) =>
          ctx.standaloneEditorRef!.deltaDecorations(ctx.deltaDecorations, []),
      }),
      scrollToLineWithError: (ctx, e) => {
        const {
          data: { range },
        } = e as DoneInvokeEvent<{ message: string; range: Range }>;
        const editor = ctx.standaloneEditorRef;
        editor?.revealLineInCenterIfOutsideViewport(range.startLineNumber);
      },
    },
  },
);

export const EditorPanel: React.FC<{
  // onSave: () => void;
  // onFork: () => void;
  // onCreateNew: () => void;
  onChange: (machine: AnyStateMachine[]) => void;
  onChangedCodeValue: (code: string) => void;
}> = ({ onChange, onChangedCodeValue }) => {
  const globalService = useGlobal();
  const sourceService = useSelector(
    globalService,
    (state) => state.context.sourceRef!,
  );
  const [sourceState] = useActor(sourceService);
  //@ts-ignore
  const value = getEditorValue(sourceState);

  const [current, send] = useMachine(editorPanelMachine, {
    actions: {
      onChange: (ctx) => {
        onChange(ctx.machines!);
      },
      onChangedCodeValue: (ctx) => {
        onChangedCodeValue(ctx.code);
      },
    },
    context: {
      ...editorPanelModel.initialContext,
      code: value,
      sourceRef: sourceService,
    },
  });
  const isVisualizing = current.hasTag('visualizing');

  return (
    <>
      <Box
        height="100%"
        display="grid"
        gridTemplateRows="1fr auto"
        data-testid="editor"
        bg='var(--unicredit-secondary-color)'
      >
        <>
          {/* This extra div acts as a placeholder that is supposed to stretch while EditorWithXStateImports lazy-loads (thanks to `1fr` on the grid) */}
          {/* <div style={{ minHeight: 0, minWidth: 0 }}> */}
          <EditorWithXStateImports
            value={value}
            onMount={(standaloneEditor, monaco) => {
              send({
                type: 'EDITOR_READY',
                monacoRef: monaco,
                standaloneEditorRef: standaloneEditor,
              });
              setTimeout(function () {
                standaloneEditor.getAction('editor.action.formatDocument').run();
                send({
                  type: 'COMPILE',
                });
              }, 300);
            }}
            onChange={(code) => {
              send({ type: 'EDITOR_CHANGED_VALUE', code });
            }}
          />
          {/* </div> */}
          <Flex bg="#f5f5f5" justify='start' py={2} gap='5'>
            <Button
              variant='secondary'
              disabled={isVisualizing}
              ml={5}
              onClick={() => {
                send({
                  type: 'COMPILE',
                });
              }}
            >
              Visualizza
            </Button>
            <SelectThemes placeholder='Seleziona tema' />
          </Flex>
        </>
      </Box>
    </>
  );
};
