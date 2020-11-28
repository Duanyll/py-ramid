import { ErrorMapper } from "utils/ErrorMapper";
import { myRooms, loadRooms } from "roomInfo";
import { tickNormalRoom } from "room";
import { tickExpansion } from "expansion";
import { prepareMoveHelper, tickMoveHelper } from "moveHelper";
import { loadCreeps } from "creep";
import "compounds";
import "structures/terminal";
import "stats"
import "rawMemory"
import "structures/observer"
import "structures/nuker";
import { tickConstruction } from "construction";
import Logger from "utils/Logger";
import { globalDelay, initTasks, tickGlobalRoutine, tickTasks } from "scheduler";

import "war";
import { tickWar } from "war";

function loadScript() {
    global.age = 0;
    Logger.prompt(`Restarting PY-RAMID ...`);
    Logger.info(`Current game tick is ${Game.time}`);
    Logger.info(`Last load lasted for ${Memory.age} ticks.`);
    Memory.roomsToAvoid = Memory.roomsToAvoid || {};
    Memory.roomCost = Memory.roomCost || {};
    Memory.labQueue = Memory.labQueue || [];
    loadRooms();
    initTasks();
    Logger.report(`It took ${Game.cpu.getUsed()} CPU to restart.`);

    globalDelay("runTerminal", 1);
    globalDelay("summatyStats", 1);
}

if (Game) {
    ErrorMapper.wrap(loadScript)();
} else {
    Logger.error(`It seems that the code is running in wrong environment...`)
}

function clearMemory() {
    // Delete unused room memory manually.
    // for (const name in Memory.rooms) {
    //     if (!(name in Game.rooms)) {
    //         delete Memory.rooms[name];
    //     }
    // }
    for (const name in Memory.creeps) {
        if (!(name in Game.creeps)) {
            delete Memory.creeps[name];
        }
    }
}

// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
export const runLoop = ErrorMapper.wrap(() => {
    Memory.age = ++global.age;

    if (global.reloadRoomsNextTick) {
        Logger.info("Reloading rooms ...");
        loadRooms();
        delete global.reloadRoomsNextTick;
    }

    loadCreeps();
    prepareMoveHelper();
    for (const name in myRooms) {
        ErrorMapper.wrap(() => tickNormalRoom(myRooms[name]))();
    }
    tickExpansion();
    tickWar();
    tickMoveHelper();
    tickConstruction();

    tickGlobalRoutine();
    tickTasks();

    clearMemory();

    if (Game.cpu.generatePixel && Game.cpu.bucket >= 9000) {
        Game.cpu.generatePixel();
        Logger.info(`Used CPU in bucket to generate 1 pixel.`);
    }
});
