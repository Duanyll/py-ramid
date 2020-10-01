import { RoomInfo, managedRooms } from "roomInfo";
import { moveCreepToRoom, moveCreepTo } from "moveHelper";

function sendClaimer(room: RoomInfo, target: string) {
    room.spawnQueue.push({
        name: `${target}-claim`, memory: {
            role: "claim", target: target
        },
        body: [{ type: CLAIM, count: 1 }, { type: MOVE, count: 5 }]
    });
}

function sendDismantler(roomName: string, target: string) {
    let room = managedRooms[roomName];
    if (!room) {
        console.log("unknown room.");
        return;
    }
    room.spawnQueue.push({
        name: `${target}-creep`, memory: {
            role: "dismantle", target: target
        },
        body: [{ type: WORK, count: 20 }, { type: MOVE, count: 20 }]
    });
}

function sendAttaker(roomName: string, target: string) {
    let room = managedRooms[roomName];
    if (!room) {
        console.log("unknown room.");
        return;
    }
    room.spawnQueue.push({
        name: `${target}-creep`, memory: {
            role: "attack", target: target
        },
        body: [{ type: ATTACK, count: 20 }, { type: MOVE, count: 20 }]
    });
}

global.sendDismantler = sendDismantler;
global.sendAttacker = sendAttaker;

function runClaimer(creep: Creep) {
    if (creep.room.name != creep.memory.target) {
        moveCreepToRoom(creep, creep.memory.target);
        // moveCreepTo(creep, new RoomPosition(25, 25, creep.memory.target))
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

function runDismantler(creep: Creep) {
    let target = Game.flags[creep.memory.target];
    if (!target) return;
    if (creep.room.name != target.pos.roomName) {
        moveCreepToRoom(creep, target.pos.roomName);
    } else if (!creep.pos.isNearTo(target)) {
        moveCreepTo(creep, target);
     } else {
        let s = target.pos.lookFor(LOOK_STRUCTURES)[0];
        if (s) {
            creep.dismantle(s);
        }
    }
}

function runAttacker(creep: Creep) {
    let target = Game.flags[creep.memory.target];
    if (!target) return;
    if (creep.room.name != target.pos.roomName) {
        moveCreepToRoom(creep, target.pos.roomName);
    } else if (!creep.pos.isNearTo(target)) {
        moveCreepTo(creep, target);
    } else {
        let s = target.pos.lookFor(LOOK_STRUCTURES)[0];
        if (s) {
            creep.attack(s);
        }
    }
}

export function tickExpansion(claimers: Creep[], dismantlers: Creep[], attackers: Creep[]) {
    if (claimers) claimers.forEach(creep => runClaimer(creep));
    if (dismantlers) dismantlers.forEach(creep => runDismantler(creep));
    if (attackers) attackers.forEach(creep => runAttacker(creep));

    Memory.roomsToClaim = Memory.roomsToClaim || [];

    let claimInfo = Memory.roomsToClaim.shift();
    if (claimInfo) {
        sendClaimer(managedRooms[claimInfo.from], claimInfo.to);
        Memory.rooms[claimInfo.to] = { helperRoom: claimInfo.from } as RoomMemory;
    }
}
