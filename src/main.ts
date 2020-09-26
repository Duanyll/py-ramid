import _ from "lodash";
global._ = _;
console.log(`Custom lodash version: ${_.VERSION}, loading lodash take ${Game.cpu.getUsed()} CPU.`);

import { runLoop } from "loop";
export const loop = runLoop;

