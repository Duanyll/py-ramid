import cfg from "config";
import { myRooms } from "room/roomInfo";
import Logger from "utils";

let origUsePowerMethod = PowerCreep.prototype.usePower;
PowerCreep.prototype.usePower = function (
    this: PowerCreep, power: PowerConstant, target?: RoomObject) {
    if (this.powerUsed) return ERR_BUSY;
    let result = origUsePowerMethod.call(this, power, target);
    if (result == OK) this.powerUsed = true;
    return result;
}

function nextPCState(pc: PowerCreep) {
    let room = myRooms[pc.memory.room];
    if (pc.ticksToLive < 1000) {
        pc.memory.state = "renew";
        return;
    }
    if (!room.structures.controller.isPowerEnabled) {
        pc.memory.state = "enablePower";
        return;
    }
    if (pc.store.getFreeCapacity() < 20) {
        pc.memory.state = "putOps";
        return;
    }
    if (pc.room.name != pc.memory.room) {
        pc.memory.state = "moveToRoom";
        return;
    }
    if (pc.store.ops < 20 && room.structures.storage.store.ops) {
        pc.memory.state = "pickOps";
        return;
    }
    let target = _.findKey(room.powerRequests, (i, id) => {
        if (!pc.powers[i.type]) return false;
        if (i.level !== undefined && pc.powers[i.type].level != i.level) return false;
        let obj = Game.getObjectById(id) as RoomObject;
        if (!obj) return false;
        if (pc.pos.getRangeTo(obj) + 10 < (pc.powers[i.type].cooldown ?? 0)) return false;
        return true;
    })
    if (target) {
        pc.memory.state = "usePower";
        pc.memory.target = target;
        return;
    }
    pc.memory.state = "idle";
}

function runOperator(pc: PowerCreep) {
    if (!pc.memory.state || pc.memory.state == "idle") {
        nextPCState(pc);
    }

    const room = myRooms[pc.memory.room];
    const storage = room.structures.storage;
    const powerSpawn = room.structures.powerSpawn;
    switch (pc.memory.state) {
        case "renew":
            if (!pc.pos.isNearTo(powerSpawn)) {
                pc.movement = { pos: powerSpawn.pos };
            } else {
                pc.renew(powerSpawn);
                pc.memory.state = "idle";
            }
            break;
        case "moveToRoom":
            pc.movement = { room: pc.memory.room };
            break;
        case "pickOps":
            if (!pc.pos.isNearTo(storage)) {
                pc.movement = { pos: storage.pos };
            } else {
                let amount = Math.min(pc.store.getFreeCapacity() - 20, storage.store.ops);
                pc.withdraw(storage, "ops", amount);
                pc.memory.state = "idle";
            }
            break;
        case "putOps":
            if (!pc.pos.isNearTo(storage)) {
                pc.movement = { pos: storage.pos };
            } else {
                pc.transfer(storage, "ops", pc.store.ops - 20);
                pc.memory.state = "idle";
            }
            break;
        case "usePower":
            let target = Game.getObjectById(pc.memory.target) as RoomObject;
            if (!room.powerRequests[pc.memory.target] || !target) {
                pc.memory.state = "idle";
                break;
            }
            if (!pc.pos.inRangeTo(target, 3)) {
                pc.movement = { pos: target.pos, range: 3 };
            } else {
                const power = room.powerRequests[pc.memory.target].type;
                let result = pc.usePower(power, target);

                if (result == OK || result != ERR_NOT_ENOUGH_RESOURCES) {
                    if (power == PWR_OPERATE_EXTENSION) room.delay("checkRefill", 1);
                    if (power == PWR_OPERATE_FACTORY) room.delay("runFactory", 1);
                    delete room.powerRequests[pc.memory.target];
                    pc.memory.state = "idle";
                }
            }
            break;
        case "enablePower":
            const controller = room.structures.controller;
            if (!pc.pos.isNearTo(controller)) {
                pc.movement = { pos: controller.pos };
            } else {
                pc.enableRoom(controller);
                pc.memory.state = "idle";
            }
            break;
    }
    if (storage.store.ops < cfg.ROOM_RESERVE_OPS
        && !pc.powerUsed
        && pc.powers[PWR_GENERATE_OPS]
        && !pc.powers[PWR_GENERATE_OPS].cooldown) {
        pc.usePower(PWR_GENERATE_OPS);
    }
}

export function runPowerCreep(pc: PowerCreep) {
    if (!pc.room) {
        if (pc.memory.room && (!pc.spawnCooldownTime || Game.time > pc.spawnCooldownTime)) {
            pc.spawn(myRooms[pc.memory.room].structures.powerSpawn);
            myRooms[pc.memory.room].registerPowerCreep(pc);
        }
    } else {
        runOperator(pc);
    }
}

global.assignPC = (name: string, room: string) => {
    let pc = Game.powerCreeps[name];
    if (pc.memory.room) {
        global.reloadRoomsNextTick = true;
    }
    pc.memory.room = room;
    myRooms[room].resource.reserve.ops = cfg.ROOM_RESERVE_OPS;
    myRooms[room].delay("checkPower", 1);
}

