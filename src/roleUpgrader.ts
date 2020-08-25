import { RoomInfo } from "roomInfo";
import { moveCreepTo } from "moveHelper";
import { CONTROLLER_SIGN, ROOM_STORE_ENERGY } from "config";

interface UpgraderMemory extends CreepMemory {
    status: "pickup" | "upgrade"
}

function runUpgrader(creep: Creep, room: RoomInfo) {
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
        if (!target && room.structures.storage && room.structures.storage.store.energy > ROOM_STORE_ENERGY) {
            target = room.structures.storage;
        }
        if (target) {
            if (creep.pos.isNearTo(target)) {
                creep.withdraw(target, RESOURCE_ENERGY);
            } else {
                moveCreepTo(creep, target);
            }
        } else {
            const source = room.detail.find(FIND_SOURCES_ACTIVE)[0];
            if (source) {
                if (creep.pos.isNearTo(source)) {
                    creep.harvest(source);
                } else {
                    moveCreepTo(creep, source);
                }
            }
        }
    } else {
        goUpgrade(creep, room);
    }
}

export function goUpgrade(creep: Creep, room: RoomInfo) {
    const c = room.structures.controller;
    if (creep.pos.isNearTo(c)) {
        creep.upgradeController(c);
        if (!c.sign || c.sign.text != CONTROLLER_SIGN) {
            creep.signController(c, CONTROLLER_SIGN);
        }
    }
    else {
        moveCreepTo(creep, c);
    }
}

export function tickUpgrader(room: RoomInfo): void {
    if (!room.creeps["upgrade"]) return;
    room.creeps["upgrade"].forEach((creep) => {
        runUpgrader(creep, room);
    })
}
