import { RoomInfo, managedRooms } from "roomInfo";
import { moveCreepToRoom, moveCreepTo } from "moveHelper";

function sendClaimer(room: RoomInfo, target: string) {
    room.spawnQueue.push({
        name: `${target}-claim`, memory: {
            role: "claim", target: target
        },
        body: [{ type: CLAIM, count: 1 }, { type: MOVE, count: 1 }]
    });
}

function runClaimer(creep: Creep) {
    if (creep.room.name != creep.memory.target) {
        // moveCreepToRoom(creep, creep.memory.target);
        moveCreepTo(creep, new RoomPosition(25, 25, creep.memory.target))
    } else {
        if (creep.pos.isNearTo(creep.room.controller)) {
            if (creep.room.controller.owner && !creep.room.controller.my) {
                creep.attackController(creep.room.controller);
            } else if (!creep.room.controller.owner) {
                creep.claimController(creep.room.controller);
                global.reloadRoomsNextTick = true;
            }
        } else {
            moveCreepTo(creep, creep.room.controller);
        }
    }
}

export function tickExpansion(claimers: Creep[]) {
    if (claimers) claimers.forEach(creep => runClaimer(creep));
    Memory.roomsToClaim = Memory.roomsToClaim || [];

    let claimInfo = Memory.roomsToClaim.shift();
    if (claimInfo) {
        sendClaimer(managedRooms[claimInfo.from], claimInfo.to);
        Memory.rooms[claimInfo.to] = { helperRoom: claimInfo.from } as RoomMemory;
    }
}
