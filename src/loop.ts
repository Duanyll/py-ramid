import { myRooms, RoomInfo } from "room/roomInfo";
import { tickNormalRoom } from "room";
import { prepareMoveHelper, tickMoveHelper } from "creep/movement";
import { loadCreeps, globalCreeps } from "creep/creepInfo";
import { runCreep } from "creep";
import { tickConstruction } from "room/construction";
import Logger from "utils";
import { globalDelay, initTasks, tickGlobalRoutine, tickTasks } from "utils";
import { GlobalStoreManager } from "industry/store";
import { ErrorMapper } from "utils";

import "utils"
import "industry"
import "war";
import "structures"
import "stats"
import cfg from "config";
import { checkMigrateDone, initMigrate } from "migrate";
import { tickSegmentRequest } from "utils/rawMemory";

function loadRooms() {
    for (const name in Game.rooms) {
        const room = Game.rooms[name];
        if (room.controller?.my) {
            myRooms[name] = new RoomInfo(name);
        }
    }
    loadCreeps();
    global.store = new GlobalStoreManager();
}

function loadScript() {
    global.age = 0;
    Logger.prompt(`Restarting PY-RAMID (build @ ${cfg.BUILD_TIME})...`);
    Logger.info(`Current game tick is ${Game.time}`);
    Logger.info(`Last load lasted for ${Memory.age} ticks.`);
    if (initMigrate()) {
        Logger.prompt(`Memory migrate in need.`);
        global.migrating = true;
        return;
    }

    initTasks();
    loadRooms();
    Logger.report(`It took ${Game.cpu.getUsed()} CPU to restart.`);

    _.forIn(cfg.GLOBAL_ROUTINE_DELAY, (time, type) => globalDelay(type as GlobalRoutine, time));
}

if (Game) {
    ErrorMapper.wrap(loadScript, "loading script.")();
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

    if (global.migrating) {
        tickSegmentRequest();
        if (!checkMigrateDone()) {
            Logger.info(`Tick ${Game.time} dropped. Waiting for migration done`);
            return;
        } else {
            global.migrating = false;
            Logger.prompt("Migration done.");
            loadScript();
        }
    }

    if (Game.cpu.generatePixel && Game.cpu.bucket == 10000 && global.age > 10 && Memory.genPixel) {
        Game.cpu.generatePixel();
        Logger.info(`Used CPU in bucket to generate 1 pixel.`);
    }

    if (global.reloadRoomsNextTick) {
        Logger.info("Reloading rooms ...");
        loadRooms();
        delete global.reloadRoomsNextTick;
    }

    loadCreeps();
    prepareMoveHelper();
    for (const name in myRooms) {
        ErrorMapper.wrap(() => tickNormalRoom(myRooms[name]), `room ${name}`)();
    }
    _.values(globalCreeps).forEach(l => l.forEach(c => runCreep(c)));
    tickMoveHelper();
    tickConstruction();

    tickGlobalRoutine();
    tickTasks();

    clearMemory();
}, "main loop");
