import { myRooms } from "room/roomInfo";
import { moveCreepToRoom, moveCreepTo } from "creep/movement";
import { registerCreepRole } from "creep/roles";
import Logger from "utils";

function sendClaimer(roomName: string, target: string) {
    let room = myRooms[roomName];
    if (!room) {
        Logger.error("unknown room.");
        return;
    }
    Memory.rooms[target] = { helperRoom: roomName } as RoomMemory;
    room.requestSpawn("claim", [[CLAIM, 1], [MOVE, 5]], {
        name: `${target}-claim`, memory: {
            role: "claim", target: target
        },
    });
}

function sendDismantler(roomName: string, target: string) {
    let room = myRooms[roomName];
    if (!room) {
        Logger.error("unknown room.");
        return;
    }
    room.requestSpawn("dismantle", [[WORK, 25], [MOVE, 25]], {
        name: `${target}-dismantle`, memory: {
            role: "dismantle", target: target
        },
    });
}

function sendAttaker(roomName: string, target: string) {
    let room = myRooms[roomName];
    if (!room) {
        Logger.error("unknown room.");
        return;
    }
    room.requestSpawn("attack", [[ATTACK, 25], [MOVE, 25]], {
        name: `${target}-attack`, memory: {
            role: "attack", target: target
        },
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
