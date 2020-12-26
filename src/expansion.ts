import { myRooms } from "roomInfo";
import { moveCreepToRoom, moveCreepTo } from "moveHelper";
import { registerCreepRole } from "creep";
import Logger from "utils/Logger";

function sendClaimer(roomName: string, target: string) {
    let room = myRooms[roomName];
    if (!room) {
        Logger.error("unknown room.");
        return;
    }
    Memory.rooms[target] = { helperRoom: roomName } as RoomMemory;
    room.spawnQueue.push({
        name: `${target}-claim`, memory: {
            role: "claim", target: target
        },
        body: [[CLAIM, 1], [MOVE, 5]]
    });
}

function sendDismantler(roomName: string, target: string) {
    let room = myRooms[roomName];
    if (!room) {
        Logger.error("unknown room.");
        return;
    }
    room.spawnQueue.push({
        name: `${target}-creep`, memory: {
            role: "dismantle", target: target
        },
        body: [[WORK, 25], [MOVE, 25]]
    });
}

function sendAttaker(roomName: string, target: string) {
    let room = myRooms[roomName];
    if (!room) {
        Logger.error("unknown room.");
        return;
    }
    room.spawnQueue.push({
        name: `${target}-creep`, memory: {
            role: "attack", target: target
        },
        body: [[ATTACK, 25], [MOVE, 25]]
    });
}

global.sendDismantler = sendDismantler;
global.sendAttacker = sendAttaker;
global.sendClaimer = sendClaimer;

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

registerCreepRole({
    "claim": runClaimer,
    "attack": runAttacker,
    "dismantle": runDismantler
})
