import type {
  AnyEventObject,
  AnyInterpreter,
  State,
  StateMachine,
} from 'xstate';
import { Model } from 'xstate/lib/model.types';
import type { editor } from 'monaco-editor';

export type AnyStateMachine = StateMachine<any, any, any>;

export type StateFrom<T> = T extends StateMachine<
  infer TContext,
  any,
  infer TEvent
>
  ? State<TContext, TEvent>
  : T extends Model<infer TContext, infer TEvent>
  ? State<TContext, TEvent, any, any>
  : never;

export type AnyState = State<any, any>;

export type SourceProvider = 'gist' | 'registry';

export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
  Datetime: any;
  /** The `JSONObject` scalar type represents JSON objects as specified by [ECMA-404](http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-404.pdf). */
  JSONObject: any;
};
export type SourceFile = {
  __typename?: 'SourceFile';
  id: Scalars['String'];
  text: Scalars['String'];
};

export type SourceFileFragment = (
  { __typename?: 'SourceFile' }
  & Pick<SourceFile, 'id' | 'text'>
);

export interface SourceRegistryData extends SourceFileFragment {
  // we can't trust SSR data to be accurate because at the moment we can use authenticated user during SSR
  // so properties like `youHaveLiked` might be initially inaccurate
  dataSource: 'ssr' | 'client';
}

export type ServiceRefEvents =
  | {
    type: 'xstate.event';
    event: AnyEventObject;
  }
  | {
    type: 'xstate.state';
    state: AnyState;
  };

export interface ServiceData {
  sessionId: string;
  machine: AnyStateMachine;
  state: AnyState;
  status: AnyInterpreter['status'];
  source: 'inspector' | 'visualizer' | 'child';
  parent: string | undefined;
}

export type SimulationMode = 'inspecting' | 'visualizing';

export type EditorThemeDefinition = editor.IStandaloneThemeData & {
  name: string;
};

export enum EmbedMode {
  Viz = 'viz',
  Panels = 'panels',
  Full = 'full',
}
export enum EmbedPanel {
  Code = 'code',
  State = 'state',
  Events = 'events',
  Actors = 'actors',
  Settings = 'settings',
}
export interface ParsedEmbed {
  mode: EmbedMode;
  panel: EmbedPanel;
  showOriginalLink: boolean;
  readOnly: boolean;
  pan: boolean;
  zoom: boolean;
  controls: boolean;
}
export type EmbedContext =
  | { isEmbedded: false }
  | ({ isEmbedded: true; originalUrl: string } & ParsedEmbed);

export interface Point {
  x: number;
  y: number;
}
