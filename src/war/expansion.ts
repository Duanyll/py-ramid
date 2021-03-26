import { myRooms } from "room/roomInfo";
import { registerCreepRole } from "creep/roles";
import Logger from "utils";
import { registerCommand } from "utils/console";

function sendClaimer(roomName: string, target: string) {
    let room = myRooms[roomName];
    if (!room) {
        Logger.error("unknown room.");
        return;
    }
    if (!(target in Memory.rooms)) {
        Logger.error("Design the room first.");
        return;
    }
    _.assign(Memory.rooms[target], { helperRoom: roomName });
    room.requestSpawn("claim", {
        name: `${target}-claim`, memory: { target },
    });
}

function sendDismantler(roomName: string, target: string) {
    let room = myRooms[roomName];
    if (!room) {
        Logger.error("unknown room.");
        return;
    }
    room.requestSpawn("dismantle", {
        name: `${target}-dismantle`, memory: { target }
    });
}

function sendAttaker(roomName: string, target: string) {
    let room = myRooms[roomName];
    if (!room) {
        Logger.error("unknown room.");
        return;
    }
    room.requestSpawn("attack", {
        name: `${target}-attack`, memory: { target },
    });
}

registerCommand('sendClaimer', 'Send a claimer creep to claim target room', [
    { name: "home", type: "myRoom" },
    { name: "target", type: "room" }
], sendClaimer);

registerCommand('sendDismantler', 'Send a unboosted dismantler creep to dismantle target flag. (NOT FOR WAR!)', [
    { name: "home", type: "myRoom" },
    { name: "target", type: "string" }
], sendDismantler);

registerCommand('sendAttacker', 'Send a unboosted atacker creep to attack target flag. (NOT FOR WAR!)', [
    { name: "home", type: "myRoom" },
    { name: "target", type: "string" }
], sendAttaker);

function runClaimer(creep: Creep) {
    if (creep.goToRoom(creep.memory.target)) {
        if (creep.goTo(creep.room.controller)) {
            if (creep.room.controller.owner && !creep.room.controller.my) {
                creep.attackController(creep.room.controller);
            } else if (!creep.room.controller.owner) {
                creep.claimController(creep.room.controller);
                global.reloadRoomsNextTick = true;
            }
        }
    }
}

function runDismantler(creep: Creep) {
    let target = Game.flags[creep.memory.target];
    if (!target) return;
    if (creep.goToRoom(target.pos.roomName) && creep.goTo(target)) {
        let s = target.pos.lookFor(LOOK_STRUCTURES)[0];
        if (s) {
            creep.dismantle(s);
        }
    }
}

function runAttacker(creep: Creep) {
    let target = Game.flags[creep.memory.target];
    if (!target) return;
    if (creep.goToRoom(target.pos.roomName) && creep.goTo(target)) {
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
