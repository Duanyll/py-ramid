import { runLoop } from "loop";
import * as consoleCommand from "./console";

export const loop = runLoop;
export const roomDelay = consoleCommand.setRoomDelayTask;
export const addRemoteSource = consoleCommand.addRemoteSource;
