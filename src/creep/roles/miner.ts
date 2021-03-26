import { RoomInfo } from "room/roomInfo";

export function runMiner(creep: Creep, room: RoomInfo) {
    let mineral = room.structures.mineral;
    let container = room.structures.mineralContainer;
    if (!container) return;
    if (!creep.pos.isEqualTo(container.pos)) {
        creep.goTo(container, 0);
    } else {
        if (creep.harvest(mineral) == OK) {
            const amount = creep.info.ability.harvest / 2;
            room.storeCurrent.add(mineral.mineralType, amount);
        }
    }
}
