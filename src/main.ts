// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change

import { ErrorMapper } from "utils/ErrorMapper";
import { RoomInfo } from "roomInfo";
import { tickRoom } from "room";

let managedRooms: { [name: string]: RoomInfo } = {}
function loadScript() {
    global.age = 0;
    console.log(`Restarting PY-RAMID ...`);
    console.log(`Current game tick is ${Game.time}`);
    console.log(`Last load lasted for ${Memory.age} ticks.`);
    for (const name in Game.rooms) {
        const room = Game.rooms[name];
        if (room.controller?.my) {
            managedRooms[name] = new RoomInfo(name);
        }
    }
    console.log(`It took ${Game.cpu.getUsed()} CPU to restart.`)
}

if (Game) {
    ErrorMapper.wrap(loadScript)();
} else {
    console.log(`It seems that the code is running in wrong environment...`)
}

function loadCreeps() {
    for (const name in managedRooms) {
        managedRooms[name].creeps = {};
        managedRooms[name].creepForRole = {};
    }
    for (const name in Game.creeps) {
        const creep = Game.creeps[name];
        if (creep.spawning) continue;
        // console.log(`Processing creep: ${name}`)
        if (creep.memory.room) {
            let room = managedRooms[creep.memory.room];
            room.creeps[creep.memory.role] = room.creeps[creep.memory.role] || [];
            room.creeps[creep.memory.role].push(creep);

            if (creep.memory.roleId) {
                room.creepForRole[creep.memory.roleId] = creep;
            }
        }
    }
}

function clearMemory() {
    for (const name in Memory.rooms) {
        if (!(name in Game.rooms)) {
            delete Memory.rooms[name];
        }
    }
    for (const name in Memory.creeps) {
        if (!(name in Game.creeps)) {
            delete Memory.creeps[name];
        }
    }
}

// This utility uses source maps to get the line numbers and file names of the original, TS source code
export const loop = ErrorMapper.wrap(() => {
    Memory.age = ++global.age;

    loadCreeps();
    for (const name in managedRooms) {
        ErrorMapper.wrap(() => tickRoom(managedRooms[name]))();
    }

    clearMemory();

    if (Game.cpu.generatePixel && Game.cpu.bucket >= 9000) {
        Game.cpu.generatePixel();
        console.log(`Used CPU in bucket to generate 1 pixel.`);
    }
});
