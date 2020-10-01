// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change

import { ErrorMapper } from "utils/ErrorMapper";
import { managedRooms, loadRooms } from "roomInfo";
import { tickRoom } from "room";
import { tickExpansion } from "expansion";
import { prepareMoveHelper, tickMoveHelper } from "moveHelper";
import { globalCreeps, loadCreeps } from "creep";

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
    for (const name in managedRooms) {
        ErrorMapper.wrap(() => tickRoom(managedRooms[name]))();
    }
    tickExpansion();
    tickMoveHelper();
    clearMemory();

    if (Game.cpu.generatePixel && Game.cpu.bucket >= 9000) {
        Game.cpu.generatePixel();
        console.log(`Used CPU in bucket to generate 1 pixel.`);
    }
});
