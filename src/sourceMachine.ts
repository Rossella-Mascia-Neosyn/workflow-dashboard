
import { useActor, useSelector } from '@xstate/react';

import {
  ActorRefFrom,
  assign,
  ContextFrom,
  DoneInvokeEvent,
  EventFrom,
  forwardTo,
  send,
  sendParent,
  spawn,
  State,
  StateFrom,
} from 'xstate';
import { createModel } from 'xstate/lib/model';

import { localCache } from './localCache';
import { notifMachine, notifModel } from './notificationMachine';
import { updateQueryParamsWithoutReload } from './utils';
import { SourceProvider, SourceRegistryData } from './types';
import { choose } from 'xstate/lib/actions';

import BaseJson from './__tests__/jsonTest/init/baseInit.json';
import ComplexJson from './__tests__/jsonTest/init/moreComplexInit.json';
import ChildeJson from './__tests__/jsonTest/init/childrenInit.json';

const initialMachineCode = JSON.stringify(ChildeJson);

export const sourceModel = createModel(
  {
    sourceID: null as string | null,
    sourceProvider: null as SourceProvider | null,
    sourceRawContent: null as string | null,
    sourceRegistryData: null as SourceRegistryData | null,
    notifRef: null! as ActorRefFrom<typeof notifMachine>,
    desiredMachineName: null as string | null,
  },
  {
    events: {
      EXAMPLE_REQUESTED: () => ({}),
      SAVE: () => ({}),
      FORK: () => ({}),
      CREATE_NEW: () => ({}),
      LOADED_FROM_GIST: (rawSource: string) => ({
        rawSource,
      }),
      CODE_UPDATED: (code: string, sourceID: string | null) => ({
        code,
        sourceID,
      }),
      /**
       * Passed in from the parent to the child via events
       */
      LOGGED_IN_USER_ID_UPDATED: (id: string | null | undefined) => ({ id }),
      CHOOSE_NAME: (name: string) => ({ name }),
      CLOSE_NAME_CHOOSER_MODAL: () => ({}),
      MACHINE_ID_CHANGED: (id: string) => ({ id }),
    },
  },
);

export type SourceMachineActorRef = ActorRefFrom<
  ReturnType<typeof makeSourceMachine>
>;

export type SourceMachineState = State<
  ContextFrom<typeof sourceModel>,
  EventFrom<typeof sourceModel>
>;

class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }

  toString() {
    return this.message;
  }
}

export const makeSourceMachine = (params: {
  sourceRegistryData: SourceRegistryData | null;
}) => {

  return sourceModel.createMachine(
    {
      initial: 'checking_initial_data',
      preserveActionOrder: true,
      context: {
        ...sourceModel.initialContext,
        sourceRawContent: 'ciao',
        sourceID: '1'
      },
      entry: assign({ notifRef: () => spawn(notifMachine) }),
      states: {
        checking_initial_data: {
          always: [
            {
              target: 'with_source',
              cond: (ctx) => Boolean(ctx.sourceRegistryData),
            },
            {
              target: 'checking_if_on_legacy_url',
            },
          ],
        },
        checking_if_on_legacy_url: {
          onDone: 'checking_url',
          meta: {
            description: `This state checks if you're on /id?=<id>, and redirects to you /<id>`,
          },
          initial: 'checking_if_id_on_query_params',
          states: {
            checking_if_id_on_query_params: {
              always: [
                {
                  cond: (ctx) => {
                    // TODO: check if `params.router.query.id` can be reliably used here instead of the client check

                    const queries = new URLSearchParams(window.location.search);

                    return Boolean(
                      queries.get('id') && !ctx.sourceRegistryData,
                    );
                  },
                  target: 'redirecting',
                },
                {
                  target: 'check_complete',
                },
              ],
            },
            redirecting: {
              entry: 'redirectToNewUrlFromLegacyUrl',
            },
            check_complete: {
              type: 'final',
            },
          },
        },
        checking_url: {
          entry: 'parseQueries',
          always: [
            { target: 'with_source', cond: (ctx) => Boolean(ctx.sourceID) },
            { target: 'no_source' },
          ],
        },
        with_source: {
          id: 'with_source',
          initial: 'loading_content',
          on: {
            CREATE_NEW: {
              actions: 'openNewWindowAtRoot',
            },
          },
          states: {
            loading_content: {
              on: {
                LOADED_FROM_GIST: {
                  target: 'source_loaded.user_does_not_own_this_source',
                  actions: assign((context, event) => {
                    return {
                      sourceRawContent: event.rawSource,
                    };
                  }),
                },
              },
              invoke: {
                src: 'loadSourceContent',
                onError: 'source_error',
              },
            },
            source_loaded: {
              entry: ['getLocalStorageCachedSource'],
              on: {
                CODE_UPDATED: {
                  actions: [
                    assign({
                      sourceRawContent: (ctx, e) => e.code,
                    }),
                    choose<
                      ContextFrom<typeof sourceModel>,
                      Extract<
                        EventFrom<typeof sourceModel>,
                        { type: 'CODE_UPDATED' }
                      >
                    >([
                      {
                        actions: [
                          forwardTo('codeCacheMachine'),
                          forwardTo('confirmBeforeLeavingMachine'),
                        ],
                        cond: () => !false,
                      },
                    ]),
                  ],
                },
              },
              initial: 'checking_if_user_owns_source',
              states: {
                checking_if_user_owns_source: {
                  always: [
                    {
                      target: 'user_does_not_own_this_source',
                    },
                  ],
                },
                user_owns_this_source: {
                  on: {

                  },
                },
                user_does_not_own_this_source: {
                  on: {

                  },
                },
              },
            },
            source_error: {
              entry: [
                send(
                  (_, e: any) =>
                    notifModel.events.BROADCAST(
                      (e.data as Error).toString(),
                      'error',
                    ),
                  { to: (ctx: any) => ctx.notifRef },
                ),
                (_: any, e: any) => {
                  if (e.data instanceof NotFoundError) {
                    updateQueryParamsWithoutReload((queries) => {
                      queries.delete('id');
                      queries.delete('gist');
                    });
                  }
                },
              ],
            },
          },
        },
        no_source: {
          id: 'no_source',
          on: {
            CODE_UPDATED: {
              actions: [
                assign({
                  sourceRawContent: (ctx, e) => e.code,
                }),
                choose<
                  ContextFrom<typeof sourceModel>,
                  Extract<
                    EventFrom<typeof sourceModel>,
                    { type: 'CODE_UPDATED' }
                  >
                >([
                  {
                    actions: [
                      forwardTo('codeCacheMachine'),
                      forwardTo('confirmBeforeLeavingMachine'),
                    ],
                    cond: () => !false,
                  },
                ]),
              ],
            },
          },
          initial: 'checking_if_in_local_storage',
          states: {
            checking_if_in_local_storage: {
              always: [
                {
                  cond: 'hasLocalStorageCachedSource',
                  target: 'has_cached_source',
                },
                {
                  target: 'no_cached_source',
                },
              ],
            },
            has_cached_source: {
              entry: ['getLocalStorageCachedSource'],
            },
            no_cached_source: {
              tags: ['canShowWelcomeMessage', 'noCachedSource'],
              on: {
                EXAMPLE_REQUESTED: {
                  actions: 'assignExampleMachineToContext',
                },
              },
            },
          },
        },
        creating: {
          id: 'creating',
          initial: 'showingNameModal',
          states: {
            showingNameModal: {
              on: {
                CHOOSE_NAME: {
                  target: 'pendingSave',
                  actions: assign((context, event) => {
                    return {
                      desiredMachineName: event.name,
                    };
                  }),
                },
                CLOSE_NAME_CHOOSER_MODAL: [
                  {
                    target: '#with_source.source_loaded',
                    cond: (ctx) => Boolean(ctx.sourceID),
                  },
                  { target: '#no_source' },
                ],
              },
            },

            pendingSave: {
              tags: ['persisting'],
              invoke: {
                src: 'createSourceFile',
                onDone: {
                  target: '#with_source.source_loaded.user_owns_this_source',
                  actions: [
                    'clearLocalStorageEntryForCurrentSource',
                    'assignCreateSourceFileToContext',
                    'updateURLWithMachineID',
                  ],
                },
                onError: [
                  {
                    /**
                     * If the source had an ID, it means we've forking
                     * someone else's
                     */
                    cond: (ctx) => Boolean(ctx.sourceID),
                    target:
                      '#with_source.source_loaded.checking_if_user_owns_source',
                    actions: 'showSaveErrorToast',
                  },
                  {
                    target: '#no_source',
                    actions: 'showSaveErrorToast',
                  },
                ],
              },
            },
          },
        },
        updating: {
          tags: ['persisting'],
          id: 'updating',
          invoke: {
            src: 'updateSourceFile',
            onDone: {
              target: 'with_source.source_loaded.user_owns_this_source',
              actions: [

              ],
            },
            onError: {
              target: 'with_source.source_loaded',
              actions: send(
                notifModel.events.BROADCAST(
                  'An error occurred when saving.',
                  'error',
                ),

              ),
            },
          },
        },
      },
    },
    {
      actions: {
        clearLocalStorageEntryForCurrentSource: (ctx) => {
          localCache.removeSourceRawContent(ctx.sourceID);
        },
        addForkOfToDesiredName: assign((context, event) => {
          if (
            !context.desiredMachineName ||
            context.desiredMachineName?.endsWith('(forked)')
          ) {
            return {};
          }
          return {
            desiredMachineName: `${context.desiredMachineName} (forked)`,
          };
        }),
        parseQueries: assign((ctx) => {
          if (typeof window === 'undefined') return {};
          const queries = new URLSearchParams(window.location.search);
          if (queries.get('gist')) {
            return {
              sourceID: queries.get('gist'),
              sourceProvider: 'gist',
            };
          }
          if (queries.get('id')) {
            return {
              sourceID: queries.get('id'),
              sourceProvider: 'registry',
            };
          }
          return {};
        }),
        openNewWindowAtRoot: () => {
          window.open('/viz', '_blank', 'noopener');
        },
      },
      services: {
        createSourceFile: async (ctx, e) => { },
        updateSourceFile: async (ctx, e) => {
          if (e.type !== 'SAVE') return;
        },
        loadSourceContent: (ctx) => async (send) => {

        },
      },
    },
  );
};


export const getEditorValue = (state: SourceMachineState) => {
  return state.context.sourceRawContent || initialMachineCode;
};

export const getShouldImmediateUpdate = (state: SourceMachineState) => {
  return Boolean(state.context.sourceRawContent);
};

