import { registerCreepRole } from "creep";
import { moveCreepToRoom } from "moveHelper";

let observeQueue: {
    [room: string]: (() => void)[];
} = {};
export function tickObserver() {
    for (const room in Game.rooms) {
        if (observeQueue[room]) {
            observeQueue[room].forEach(f => f());
            delete observeQueue[room];
        }
    }
}

function RunScout(creep: Creep) {
    if (creep.memory.target) {
        if (creep.room.name != creep.memory.target) {
            moveCreepToRoom(creep, creep.memory.target);
        }
    }
}

export function onVisibility(room: string, callback: () => void) {
    if (Game.rooms[room])
        callback();
    else {
        observeQueue[room] = observeQueue[room] || [];
        observeQueue[room].push(callback);
    }
}
