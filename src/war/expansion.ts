import cfg from "config";
import { creepRole, CreepRoleBase, memorize } from "creep/role";
import { myRooms } from "room/roomInfo";
import Logger from "utils";
import { registerCommand, runCommand } from "utils/console";

function sendClaimer(roomName: string, target: string) {
    let room = myRooms[roomName];
    if (!room) {
        Logger.error("unknown room.");
        return;
    }
    _.assign(Memory.rooms[target], { helperRoom: roomName });
    room.requestSpawn("claim", {
        name: `${target}-claim`, memory: { target, home: roomName } as any,
    });
}

function sendDismantler(roomName: string, target: string, size: number) {
    let room = myRooms[roomName];
    if (!room) {
        Logger.error("unknown room.");
        return;
    }
    room.requestSpawn("dismantle", {
        name: `${target}-dismantle`, memory: { target },
        body: [[WORK, size], [MOVE, size]]
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
    { name: "target", type: "string" },
    { name: "size", type: "number", description: "how many WORK part should the creep carry" }
], sendDismantler);

registerCommand('sendAttacker', 'Send a unboosted atacker creep to attack target flag. (NOT FOR WAR!)', [
    { name: "home", type: "myRoom" },
    { name: "target", type: "string" }
], sendAttaker);

@creepRole("claim")
export class RoleClaimer extends CreepRoleBase {
    @memorize
    target: string;
    @memorize
    home: string;
    designRequest: boolean;
    run(creep: Creep) {
        if (creep.goToRoom(this.target)) {
            const con = creep.room.controller;
            if (!creep.room.memory.design) {
                if (!this.designRequest) {
                    runCommand("designRoom", creep.room.name, true);
                    this.designRequest = true;
                }
            }
            if (creep.goTo(con)) {
                if (con.owner && !con.my) {
                    creep.attackController(con);
                } else if (!con.owner) {
                    if (!creep.room.memory.design) return;
                    creep.room.memory.helperRoom = this.home;
                    creep.claimController(con);
                    const sign = Memory.rooms[creep.room.name]?.sign || cfg.DEFAULT_CONTROLLER_SIGN;
                    creep.signController(con, sign);
                    global.reloadRoomsNextTick = true;
                }
            }
        }
    }

    static defaultBody: BodyPartDescription = [[MOVE, 5], [CLAIM, 1]];
}

@creepRole("dismantle")
export class RoleSimpleDismantler extends CreepRoleBase {
    @memorize
    target: string;
    run(creep: Creep) {
        let target = Game.flags[this.target];
        if (!target) return;
        if (creep.goToRoom(target.pos.roomName) && creep.goTo(target)) {
            let s = target.pos.lookFor(LOOK_STRUCTURES)[0];
            if (s) {
                creep.dismantle(s);
            }
        }
    }

    static defaultBody: BodyPartDescription = [[WORK, 25], [MOVE, 25]];
}

@creepRole("attack")
export class RoleSimpleAttacker extends CreepRoleBase {
    @memorize
    target: string;
    run(creep: Creep) {
        let target = Game.flags[this.target];
        if (!target) return;
        if (creep.goToRoom(target.pos.roomName) && creep.goTo(target)) {
            let s = target.pos.lookFor(LOOK_STRUCTURES)[0];
            if (s) {
                creep.attack(s);
            }
        }
    }

    static defaultBody: BodyPartDescription = [[ATTACK, 25], [MOVE, 25]];
}
