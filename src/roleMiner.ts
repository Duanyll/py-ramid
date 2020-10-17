import { moveCreepTo } from "moveHelper";
import { RoomInfo } from "roomInfo";

interface HarvesterMemory extends CreepMemory {
    status: "harvest" | "move"
}

export function runMiner(creep: Creep, room: RoomInfo) {
    let mineral = room.structures.mineral;
    let container = room.structures.mineralContainer;
    if (!creep.pos.isEqualTo(container.pos)) {
        moveCreepTo(creep, container);
    } else {
        creep.harvest(mineral);
        if (container.store[mineral.mineralType] > 1000) {
            room.moveRequests.out[container.id] = {};
        }
    }
}
