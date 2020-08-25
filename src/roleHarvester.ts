import { RoomInfo } from "roomInfo";
import { moveCreepTo } from "moveHelper";
import { goRefill } from "roleCarrier";

interface HarvesterMemory extends CreepMemory {
    status: "harvest" | "move"
}

function runHarvester(creep: Creep, room: RoomInfo) {
    let m = creep.memory as HarvesterMemory;
    m.status = m.status || "harvest";
    if (m.status == "move" && creep.store.energy == 0) {
        m.status = "harvest";
    }
    if (m.status == "harvest" && creep.store.getFreeCapacity(RESOURCE_ENERGY) < 10) {
        m.status = "harvest";
    }

    const sourceId = Number(_.last(m.roleId));
    if (m.status = "harvest") {
        const target = room.detail.find(FIND_SOURCES)[sourceId];
        if (creep.pos.isNearTo(target)) {
            creep.harvest(target);
        } else {
            moveCreepTo(creep, target);
        }
    } else {
        if (!room.creeps["carry"]) { if (goRefill(creep, room)) return; }
        const target = room.structures.sourceLink[sourceId] || room.structures.storage;
        if (creep.pos.isNearTo(target)) {
            creep.transfer(target, RESOURCE_ENERGY);
        } else {
            moveCreepTo(creep, target);
        }
    }
}

export function tickHarvester(room: RoomInfo): void {
    if (!room.creeps["harvest"]) return;
    room.creeps["harvest"].forEach((creep) => {
        runHarvester(creep, room);
    })
}

