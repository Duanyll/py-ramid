import { RoomInfo } from "roomInfo";

export function tickLink(room: RoomInfo) {
    function trySend(from: StructureLink, to: StructureLink) {
        if (!from || !to) return false;
        if (from.cooldown) return false;
        if (to.store.energy <= 200 || from.store.getFreeCapacity(RESOURCE_ENERGY) <= 200 && to.store.energy <= 590) {
            from.transferEnergy(to);
            return true;
        }
        return false;
    }
    if (room.structures.sourceLink[0]) {
        if (!trySend(room.structures.sourceLink[0], room.structures.controllerLink)) {
            trySend(room.structures.sourceLink[0], room.structures.centerLink)
        }
    }
    if (room.structures.sourceLink[1]) {
        if (!trySend(room.structures.sourceLink[1], room.structures.centerLink)) {
            trySend(room.structures.sourceLink[1], room.structures.controllerLink)
        }
    }
}
