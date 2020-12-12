// tslint:disable:no-var-requires
global._ = require("lodash4");
console.log(`Custom lodash version: ${_.VERSION}, loading lodash take ${Game.cpu.getUsed()} CPU.`);
