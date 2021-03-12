import { RoomInfo } from "room/roomInfo";
import { goRefill } from "creep/roles/carrier";

interface HarvesterMemory extends CreepMemory {
    status: "harvest" | "move"
}

export function runHarvester(creep: Creep, room: RoomInfo) {
    let m = creep.memory as HarvesterMemory;
    const sourceId = Number(_.last(m.roleId)) - 1;
    const source = room.structures.sources[sourceId];
    const link = room.structures.sourceLink[sourceId];
    const useLink = link
        && !(room.structRcl < 5 || (room.structRcl <= 6 && sourceId == 1)) // 6 级房没有 centerLink, 不能传送, 必须直接送达
        && !_.isEmpty(room.creepForRole["carry1"]);

    if (useLink) {
        if (creep.store.free() > 20 && creep.goTo(source)) {
            creep.harvest(source);
        }
        if (creep.store.free() <= 20) {
            if (creep.goTo(link)) {
                creep.transfer(link, "energy");
                room.delay("runLinks", 1);
            }
        }
    } else {
        m.status = m.status || "harvest";
        if (m.status == "move" && creep.store.energy == 0) {
            m.status = "harvest";
        }
        if (m.status == "harvest" && creep.store.free() < creep.getActiveBodyparts(WORK) * 2) {
            m.status = "move";
        }

        if (m.status == "harvest") {
            if (creep.goTo(source)) {
                creep.harvest(source);
            }
        } else {
            if (_.isEmpty(room.creepForRole["carry1"])) { if (goRefill(creep, room)) return; }
            let storage =  room.structures.storage;
            if (creep.goTo(storage)) {
                creep.transfer(storage, "energy");
            }
        }
    }
}
