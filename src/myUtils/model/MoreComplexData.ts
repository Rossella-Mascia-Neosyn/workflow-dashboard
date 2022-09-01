

export interface Headers {
    "Content-Type"?: string;
}

export interface EntryAction {
    type: string;
    expectResponse?: boolean;
    method: string;
    headers?: Headers | null;
    forwardOmcJwt: boolean;
    url: string;
    body?: string;
    childTag?: any;
    expectEvent?: boolean;
}
// export type TypeOfBlock = 'SimpleState' | 'ForEachChildState' | 'ActionState';
export interface State {
    type: string;
    id: string | 'BROADCAST_COMPLETED' | 'CHILDREN_SIGNATURE';
    microfrontendBullet?: boolean;
    bulletName?: string;
    entryActions?: EntryAction[];
    recoveryEvent?: string;
    tag?: string;
    eventToChild?: string;
    continueEvent?: string;
    koEvent?: string;
    doneEvent?: string;
}

export interface Action {
    type: string;
    method?: string;
    url?: string;
    headers?: Headers;
    body?: string;
    expectEvent?: boolean;
    expectResponse?: boolean;
    forwardOmcJwt?: boolean;
    update?: string;
    productName?: string;
    delegateControl?: boolean;
    event?: string;
    workflowId?: string;
}

export interface Transition {
    type: string;
    source: string;
    target?: string;
    event: string;
    actions?: Action[];
}

export interface MoreComplexData {
    id: string;
    initialState: string;
    endStates: string[];
    states: State[];
    transitions: Transition[];
    version: number;
    deprecated: boolean;
}



