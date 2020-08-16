// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change

import { ErrorMapper } from "utils/ErrorMapper";
import { RoomInfo } from "roomInfo";

global.age = 0;
console.log(`Restarting PY-RAMID ...`);
console.log(`Current game tick is ${Game.time}`);
console.log(`Last load lasted for ${Memory.age} ticks.`);

var managedRooms: { [name: string]: RoomInfo } = {}
function loadScript() {
    for (const name in Game.rooms) {
        const room = Game.rooms[name];
        if (room.controller?.my) {
            managedRooms[name] = new RoomInfo(name);
        }
    }
}

ErrorMapper.wrap(loadScript)();

// This utility uses source maps to get the line numbers and file names of the original, TS source code
export const loop = ErrorMapper.wrap(() => {
    if (global.age == 0) {
        console.log(`It taked ${Game.cpu.getUsed()} CPU to restart.`)
    }
    Memory.age = ++global.age;

    for (const name in managedRooms) {
        ErrorMapper.wrap(() => managedRooms[name].tick())();
    }
});
