import { RoomInfo } from "roomInfo";
import { moveCreepTo, moveCreepToRoom } from "moveHelper";
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
        if (room.structRcl == 6 && sourceId == 1) target = room.structures.storage;
        if (creep.pos.isNearTo(target)) {
            creep.transfer(target, RESOURCE_ENERGY);
        } else {
            moveCreepTo(creep, target);
        }
    }
}

interface RemoteHarvesterMemory extends CreepMemory {
    status: "harvest" | "move";
    source: { id: string, room: string }
}

function runRemoteHarvester(creep: Creep, room: RoomInfo) {
    let m = creep.memory as RemoteHarvesterMemory;
    m.status = m.status || "harvest";
    m.source = m.source || room.detail.memory.remoteSources[Number(_.last(m.roleId))];
    if (m.status == "move" && creep.store.energy == 0) {
        m.status = "harvest";
    }
    if (m.status == "harvest" && creep.store.getFreeCapacity() == 0) {
        m.status = "move";
    }

    if (m.status == "harvest") {
        const target = Game.getObjectById(m.source.id) as Source;
        if (target) {
            if (creep.pos.isNearTo(target)) {
                creep.harvest(target);
            } else {
                moveCreepTo(creep, target);
            }
        } else {
            moveCreepToRoom(creep, m.source.room);
        }
    } else {
        if (creep.room.name == room.name) {
            if (!room.creeps["carry"]) { if (goRefill(creep, room)) return; }
            let target = room.structures.storage;
            // 6 级房没有 centerLink, 不能传送, 必须直接送达
            if (creep.pos.isNearTo(target)) {
                creep.transfer(target, RESOURCE_ENERGY);
            } else {
                moveCreepTo(creep, target);
            }
        } else {
            moveCreepToRoom(creep, room.name);
        }
    }
}

export function tickHarvester(room: RoomInfo): void {
    if (room.creeps["harvest"]) {
        room.creeps["harvest"].forEach((creep) => {
            runHarvester(creep, room);
        });
    }

    if (room.creeps["remoteHarvest"]) {
        room.creeps["remoteHarvest"].forEach((creep) => {
            runRemoteHarvester(creep, room);
        });
    }
}

