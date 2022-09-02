import { InterpreterFrom } from "xstate";
import { createInterpreterContext } from "../utils";
import { GlobalMachine } from "./globalMachine";

const [GlobalProvider, useGlobal, createGlobalSelector] = createInterpreterContext('Global');

export { GlobalProvider, useGlobal };