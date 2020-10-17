// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change

import { ErrorMapper } from "utils/ErrorMapper";
import { myRooms, loadRooms } from "roomInfo";
import { tickNormalRoom } from "room";
import { tickExpansion } from "expansion";
import { prepareMoveHelper, tickMoveHelper } from "moveHelper";
import { loadCreeps } from "creep";
import { tickSegmentRequest } from "rawMemory";
import { summaryStats } from "stats";
import { tickObserver } from "observer";
import { runTerminals } from "terminal";

function loadScript() {
    global.age = 0;
    console.log(`Restarting PY-RAMID ...`);
    console.log(`Current game tick is ${Game.time}`);
    console.log(`Last load lasted for ${Memory.age} ticks.`);
    loadRooms();
    console.log(`It took ${Game.cpu.getUsed()} CPU to restart.`)
}

if (Game) {
    ErrorMapper.wrap(loadScript)();
} else {
    console.log(`It seems that the code is running in wrong environment...`)
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

// This utility uses source maps to get the line numbers and file names of the original, TS source code
export const runLoop = ErrorMapper.wrap(() => {
    Memory.age = ++global.age;

    if (global.reloadRoomsNextTick) {
        console.log("Reloading rooms ...");
        loadRooms();
        delete global.reloadRoomsNextTick;
    }

    loadCreeps();
    prepareMoveHelper();
    global.remainConstructionCount = MAX_CONSTRUCTION_SITES - _.size(Game.constructionSites);
    for (const name in myRooms) {
        ErrorMapper.wrap(() => tickNormalRoom(myRooms[name]))();
    }
    tickExpansion();
    tickObserver();
    tickMoveHelper();
    if (Game.time % 20) runTerminals();
    summaryStats();

    tickSegmentRequest();
    clearMemory();

    if (Game.cpu.generatePixel && Game.cpu.bucket >= 9000) {
        Game.cpu.generatePixel();
        console.log(`Used CPU in bucket to generate 1 pixel.`);
    }
});
