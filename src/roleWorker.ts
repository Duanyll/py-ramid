import { RoomInfo } from "roomInfo";
import { moveCreepTo } from "moveHelper";
import { goRefill } from "roleCarrier";
import { goBuild } from "roleBuilder";
import { goUpgrade } from "roleUpgrader";

interface WorkerMemory extends CreepMemory {
    status: "pickup" | "refill" | "build"
}

function runWorker(creep: Creep, room: RoomInfo) {
    let m = creep.memory as WorkerMemory;
    if (!m.status) m.status = "pickup";
    if ((m.status == "build" || m.status == "refill") && creep.store.energy == 0) {
        m.status = "pickup";
    }
    if (m.status == "pickup" && creep.store.getFreeCapacity(RESOURCE_ENERGY) < 10) {
        if (room.detail.energyAvailable < room.detail.energyCapacityAvailable) {
            m.status = "refill";
        } else {
            m.status = "build";
        }
    }
    if (m.status == "pickup") {
        const sourceId = Number(_.last(m.roleId)) % 2;
        const target = room.structures.sources[sourceId];
        if (creep.pos.isNearTo(target)) {
            creep.harvest(target);
        } else {
            moveCreepTo(creep, target);
        }
        return;
    }
    if (m.status == "refill") {
        if (goRefill(creep, room)) return;
    }
    if (goBuild(creep, room)) return;
    goUpgrade(creep, room);
}

export function tickWorker(room: RoomInfo): void {
    if (!room.creeps["work"]) return;
    room.creeps["work"].forEach((creep) => {
        runWorker(creep, room);
    })
}
