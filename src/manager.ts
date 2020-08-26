import { RoomInfo } from "roomInfo";

export function tickManager(room: RoomInfo) {
    let creep = room.creepForRole["center"];
    if (!creep) return;
    let m = creep.memory;
    if (m.target) {
        const target = Game.getObjectById(m.target) as AnyStoreStructure;
        for (const res in creep.store) {
            creep.transfer(target, res as ResourceConstant);
        }
        m.target = undefined;
    } else {
        if (room.structures.centerLink.store.getFreeCapacity(RESOURCE_ENERGY) <= 100) {
            m.target = room.structures.storage.id;
            creep.withdraw(room.structures.centerLink, RESOURCE_ENERGY);
            return;
        }
    }
}
