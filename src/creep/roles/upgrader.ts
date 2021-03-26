import { RoomInfo } from "room/roomInfo";
import cfg from "config";

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
            if (creep.goTo(target)) {
                creep.withdraw(target, RESOURCE_ENERGY);
            }
        } else {
            const sourceId = Number(_.last(m.roleId)) % 2;
            const source = room.structures.sources[sourceId];
            if (creep.goTo(source)) {
                creep.harvest(source);
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

export function runBoostedUpgrader(creep: Creep, room: RoomInfo) {
    if (!room.state.energy.usage.upgrade) return;
    const controller = room.structures.controller;
    if (creep.goTo(controller, 2)) {
        creep.upgradeController(controller);
        if (creep.store.energy <= creep.getActiveBodyparts("work")) {
            const link = room.structures.controllerLink;
            if (creep.goTo(link)) {
                creep.withdraw(link, "energy");
                if (link.energy < 200) {
                    room.delay("runLinks", 1);
                }
            }
        }
    }
}

export function goSignRoom(creep: Creep, room: Room) {
    const sign = Memory.rooms[room.name]?.sign || cfg.DEFAULT_CONTROLLER_SIGN;
    let controller = room.controller;
    if (!controller.sign || controller.sign.username != SYSTEM_USERNAME && controller.sign.text != sign) {
        if (creep.goTo(controller)) {
            creep.signController(controller, sign);
        }
    }
}

export function goUpgrade(creep: Creep, room: RoomInfo) {
    const c = room.structures.controller;
    if (creep.goTo(c, 2)) {
        creep.upgradeController(c);
        goSignRoom(creep, room.detail);
    }
}
