import { RoomInfo } from "room/roomInfo";

export function runMiner(creep: Creep, room: RoomInfo) {
    let mineral = room.structures.mineral;
    let container = room.structures.mineralContainer;
    if (!container) return;
    if (!creep.pos.isEqualTo(container.pos)) {
        creep.goTo(container, 0);
    } else {
        if (creep.harvest(mineral) == OK) {
            const amount = HARVEST_MINERAL_POWER * creep.getActiveBodyparts(WORK);
            room.storeCurrent.add(mineral.mineralType, amount);
        }
    }
}
