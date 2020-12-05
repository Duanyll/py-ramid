import { RoomInfo } from "roomInfo";
import { moveCreepTo } from "moveHelper";
import { CONTROLLER_SIGN } from "config";

interface UpgraderMemory extends CreepMemory {
    status: "pickup" | "upgrade"
}

export function runUpgrader(creep: Creep, room: RoomInfo) {
    let m = creep.memory as UpgraderMemory;
    m.status = m.status || "pickup";
    if (m.status == "upgrade" && creep.store.energy == 0) {
        m.status = "pickup";
    }
    if (m.status == "pickup" && creep.store.getFreeCapacity(RESOURCE_ENERGY) < 10) {
        m.status = "upgrade";
    }

    if (m.status == "pickup") {
        let target: AnyStoreStructure = room.structures.controllerLink;
        if (!target && room.structures.storage && !room.state.energy.storeMode) {
            target = room.structures.storage;
        }
        if (target) {
            if (creep.pos.isNearTo(target)) {
                creep.withdraw(target, RESOURCE_ENERGY);
            } else {
                moveCreepTo(creep, target);
            }
        } else {
            const sourceId = Number(_.last(m.roleId)) % 2;
            const source = room.structures.sources[sourceId];
            if (creep.pos.isNearTo(source)) {
                creep.harvest(source);
            } else {
                moveCreepTo(creep, source);
            }
        }
    } else {
        if (room.state.energy.usage .upgrade
            || room.structures.controller.level < 8
            || Game.time % 50 == 0
            || room.structures.controller.ticksToDowngrade < CONTROLLER_DOWNGRADE[room.structures.controller.level] - 10000)
            goUpgrade(creep, room);
    }
}

export function goSignRoom(creep: Creep, room: Room) {
    const sign = Memory.rooms[room.name]?.sign || CONTROLLER_SIGN;
    let controller = room.controller;
    if (!controller.sign || controller.sign.username != SYSTEM_USERNAME && controller.sign.text != sign) {
        if (creep.pos.isNearTo(controller)) {
            creep.signController(controller, sign);
        } else {
            moveCreepTo(creep, controller);
        }
    }
}

export function goUpgrade(creep: Creep, room: RoomInfo) {
    const c = room.structures.controller;
    if (creep.pos.inRangeTo(c, 2)) {
        creep.upgradeController(c);
        goSignRoom(creep, room.detail);
    }
    else {
        moveCreepTo(creep, c);
    }
}
