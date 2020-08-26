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
    if (m.status == "harvest" && creep.store.getFreeCapacity() == 0) {
        m.status = "move";
    }

    const sourceId = Number(_.last(m.roleId)) - 1;
    if (m.status == "harvest") {
        const target = room.structures.sources[sourceId];
        if (creep.pos.isNearTo(target)) {
            creep.harvest(target);
        } else {
            moveCreepTo(creep, target);
        }
    } else {
        if (!room.creeps["carry"]) { if (goRefill(creep, room)) return; }
        let target = room.structures.sourceLink[sourceId] || room.structures.storage;
        // 6 级房没有 centerLink, 不能传送, 必须直接送达
        if (room.design.stages[room.design.currentStage - 1].rcl == 6 && sourceId == 1) target = room.structures.storage;
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

