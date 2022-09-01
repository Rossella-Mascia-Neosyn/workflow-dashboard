
import { ActionObject, AnyEventObject, StateMachine, StateNode } from "xstate";
import { MoreComplexData, Transition, State } from "./model/MoreComplexData";


// Partial<StateMachine<unknown, any, AnyEventObject, { value: any; context: unknown; }, ActionObject<unknown, AnyEventObject>>>
//Partial<StateNode> 

const calcolateObjOnSimple = (transitions: Transition[], stateEvent?: string) => {
    const reduceTransitions = transitions.reduce<Record<string, any>>((acc, { event, target, source, actions, type }) => {
        const isInternal = type === 'InternalTransition';
        acc[stateEvent || event] = {
            "target": target || source,
            "internal": isInternal,
            actions: actions ?? [],
            "type": isInternal ? 'internal' : 'external',
        };

        return acc
    }, {});

    return reduceTransitions;
};

const calcolateObjOnChild = (transitions: Transition[], stateEvent: string) => {
    const reduceTransitions = transitions.reduce<Record<string, any>>((acc, { event, target, source, actions, type }) => {
        const isInternal = type === 'InternalTransition';

        acc[event || stateEvent] = {
            "target": target || source,
            "internal": isInternal,
            actions: actions ?? [],
            "type": isInternal ? 'internal' : 'external',
        };

        return acc
    }, {});

    return reduceTransitions;
};

const handlerType = (state: State, transitions: Transition[]) => {
    switch (state.type) {
        case 'SimpleState':
        case 'ActionState':
            return handlerSimple(state, transitions);
        case 'ForEachChildState':
            return handlerForEachChild(state, transitions);
    }
};

const handlerNameForEachChild = (name: State['id'], nameProperty: 'childrenListKey' | 'nextChildKey' | 'target' | 'event') => {

    if (nameProperty === 'childrenListKey') {
        switch (name) {
            case 'CHILDREN_SIGNATURE':
                return 'CHILDREN_SIGNATURE_CHILDREN';
            case 'BROADCAST_COMPLETED':
                return 'BROADCAST_COMPLETED_CHILDREN';
            default:
                return name;
        }
    }

    if (nameProperty === 'nextChildKey') {
        switch (name) {
            case 'CHILDREN_SIGNATURE':
                return 'CHILDREN_SIGNATURE_NEXT_CHILD';
            case 'BROADCAST_COMPLETED':
                return 'BROADCAST_COMPLETED_NEXT_CHILD';
            default:
                return name;
        }
    }

    if (nameProperty === 'target') {
        switch (name) {
            case 'CHILDREN_SIGNATURE':
                return '##CHILDREN_SIGNATURE_NEXT_CHILD##';
            case 'BROADCAST_COMPLETED':
                return '##BROADCAST_COMPLETED_NEXT_CHILD##';
            default:
                return name;
        }
    }

    if (nameProperty === 'event') {
        switch (name) {
            case 'CHILDREN_SIGNATURE':
                return 'SIGNED';
            case 'BROADCAST_COMPLETED':
                return 'COMPLETED';
            default:
                return name;
        }
    }
}

const handlerForEachChild = (state: State, transitions: Transition[]) => {
    return {
        [state.id]: {
            "tags": "ForEachChildState",
            "on": calcolateObjOnChild(transitions, state.koEvent!),
            "entry": {
                "childrenListKey": handlerNameForEachChild(state.id, 'childrenListKey'),
                "type": "RequestForChildInstancesAction",
            },
            "initial": "FOR",
            "states": {
                "FOR": {
                    "entry": [{
                        "childrenListKey": handlerNameForEachChild(state.id, 'childrenListKey'),
                        "doEvent": "DO",
                        "doneEvent": state.doneEvent,
                        "nextChildKey": handlerNameForEachChild(state.id, 'nextChildKey'),
                        "type": "NextChildOrExitAction",
                    }],
                    "on": {
                        "DO": {
                            "actions": [
                                {
                                    "event": handlerNameForEachChild(state.id, 'event'),
                                    "target": handlerNameForEachChild(state.id, 'target'),
                                    "type": "EventToInstanceAction",
                                }
                            ],
                            "internal": false,
                            "target": "WAIT",
                            "type": "external"
                        }
                    }
                },
                "WAIT": {
                    "on": {
                        [state.continueEvent!]: {
                            "target": "FOR",
                            "internal": false,
                            "type": "external",
                        }
                    },
                    "type": "atomic",
                    "tags": [
                        "SimpleState"
                    ],
                }
            }
        },
    }

};

const handlerMetaDescription = ({ bulletName, recoveryEvent }: State) => {
    let description = [];

    if (recoveryEvent) description.push(`recoveryEvent: ${recoveryEvent}`)
    if (bulletName) description.push(`bulletName: ${bulletName}`)

    return description.join('\\n');
};

const handlerSimple = (state: State, transitions: Transition[]) => {
    //TransitionConfigOrTarget<any, any>
    return {
        [state.id]: {
            ...(state.recoveryEvent || state.bulletName ? {
                "meta": {
                    "description": handlerMetaDescription(state)
                }
            } : {}),
            "tags": [
                state.type
            ],
            "type": "atomic",
            "on": calcolateObjOnSimple(transitions),
            ...(state.entryActions ? { entry: state.entryActions, } : {}),
        },
    };
}

export const handlerRemap = (data: MoreComplexData): any => {
    const states = data.states.reduce<Record<string, any>>(
        (acc, state) => {
            const filterTransition = data.transitions.filter((el) => el.source === state.id);
            if (!filterTransition.length) return acc;

            return {
                ...acc,
                ...handlerType(state, filterTransition)
            };
        },
        {}
    );

    data.endStates.forEach((endState) => {
        const foundState = data.states.find((el) => el.id === endState);

        states[endState] = {
            type: 'final',
            on: {},
            tags: [
                foundState?.type
            ],
            ...(foundState?.entryActions ? { entry: foundState.entryActions } : {}),
        };
    });

    return {
        id: data.id,
        initial: data.initialState,
        type: "compound",
        version: String(data.version),
        states,
    };
};
