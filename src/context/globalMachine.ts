import { ActorRefFrom, assign, spawn } from "xstate";
import { send } from "xstate/lib/actions";
import { createModel } from "xstate/lib/model";
import { notifMachine } from "../notificationMachine";
import { makeSourceMachine, SourceMachineActorRef } from "../sourceMachine";
import { SourceRegistryData } from "../types";

export type GlobalMachine = ReturnType<typeof createGlobalMachine>;


const globalModel = createModel(
    {
        notifRef: null! as ActorRefFrom<typeof notifMachine>,
        sourceRef: null as SourceMachineActorRef | null,
    }
);


export const createGlobalMachine = (params: {
    sourceRegistryData: SourceRegistryData | null;
}) =>
    globalModel.createMachine(
        {
            preserveActionOrder: true,
            id: 'global',
            initial: 'initializing',
            context: globalModel.initialContext,
            entry: assign({
                notifRef: () => spawn(notifMachine),
            }),
            invoke: {
                // this wouldn't be needed if only internal Supabase's `getSessionFromUrl` (happening after redirect) would be synchronous
                src: (ctx) => (sendBack) => {

                },
            },
            states: {
                initializing: {
                    entry: [
                        globalModel.assign((ctx) => {
                            return {
                                sourceRef: spawn(
                                    makeSourceMachine({
                                        sourceRegistryData: params.sourceRegistryData,
                                    }),
                                ),
                            };
                        }),
                    ],

                },
            },
        },
    );