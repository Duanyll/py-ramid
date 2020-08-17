// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change

import { ErrorMapper } from "utils/ErrorMapper";
import { RoomInfo } from "roomInfo";

var managedRooms: { [name: string]: RoomInfo } = {}
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
    console.log(`It taked ${Game.cpu.getUsed()} CPU to restart.`)
}

if (global.Game) {
    ErrorMapper.wrap(loadScript)();
} else {
    console.log(`It seems that the code is running in wrong environment...`)
}

// This utility uses source maps to get the line numbers and file names of the original, TS source code
export const loop = ErrorMapper.wrap(() => {
    Memory.age = ++global.age;

    for (const name in managedRooms) {
        ErrorMapper.wrap(() => managedRooms[name].tick())();
    }
});
