import _ from "lodash";
global._ = _;
Logger.info(`Custom lodash version: ${_.VERSION}, loading lodash take ${Game.cpu.getUsed()} CPU.`);

import { runLoop } from "loop";
import Logger from "utils/Logger";
export const loop = runLoop;

