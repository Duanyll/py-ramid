import { myRooms, RoomInfo } from "room/roomInfo";
import { tickNormalRoom } from "room";
import { prepareMovement, processMovement } from "creep/movement";
import { loadCreeps, globalCreeps } from "creep/creepInfo";
import { clearCreepMemory, runCreep } from "creep";
import { tickConstruction } from "room/construction";
import Logger from "utils";
import { setTimeout, initTasks, tickGlobalRoutine, tickTasks } from "utils";
import { ErrorMapper } from "utils";

import "room/roles"
import "utils"
import "industry"
import "war";
import "structures"
import "stats"
import cfg from "config";
import { checkMigrateDone, initMigrate } from "migrate";
import Storage from "utils/rawMemory";
import { runPowerCreep } from "creep/powerCreep";
import { confirmMarketOrders } from "industry/market";

function loadRooms() {
    for (const name in Game.rooms) {
        const room = Game.rooms[name];
        if (room.controller?.my) {
            if (!room.memory.design) {
                Logger.prompt(
                    `No room design data for room ${room.name}, skip loading this room. Create design info with command designRoom(${room.name})`);
                continue;
            }
            myRooms[name] = new RoomInfo(name);
        }
    }
    loadCreeps();

    for (const name in Game.powerCreeps) {
        const pc = Game.powerCreeps[name];
        if (pc.memory.room && pc.room) {
            myRooms[pc.memory.room].registerPowerCreep(pc);
        }
    }
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

    _.forIn(cfg.GLOBAL_ROUTINE_DELAY, (time, type) => setTimeout(type as GlobalRoutine, time));
}

if (Game) {
    ErrorMapper.wrap(loadScript, "loading script.")();
} else {
    Logger.error(`It seems that the code is running in wrong environment...`)
}

// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
export const runLoop = ErrorMapper.wrap(() => {
    Memory.age = ++global.age;

    if (global.migrating) {
        Storage.tick();
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

    confirmMarketOrders();

    loadCreeps();
    prepareMovement();
    for (const name in myRooms) {
        ErrorMapper.wrap(() => tickNormalRoom(myRooms[name]), `room ${name}`)();
    }
    _.values(globalCreeps).forEach(l => l.forEach(c => runCreep(c)));
    _.values(Game.powerCreeps).forEach(pc => runPowerCreep(pc));

    processMovement();
    tickConstruction();

    tickGlobalRoutine();
    tickTasks();
    Storage.tick();

    clearCreepMemory();
}, "main loop");
