import { moveCreepTo } from "creep/movement";
import { myRooms, RoomInfo } from "room/roomInfo";

export function runMiner(creep: Creep, room: RoomInfo) {
    let mineral = room.structures.mineral;
    let container = room.structures.mineralContainer;
    if (!container) return;
    if (!creep.pos.isEqualTo(container.pos)) {
        moveCreepTo(creep, container);
    } else {
        if (creep.harvest(mineral) == OK) {
            const amount = HARVEST_MINERAL_POWER * creep.getActiveBodyparts(WORK);
            room.state.mineralToTransport += amount;
            if (room.state.mineralToTransport > 1000) {
                room.state.mineralToTransport = 0;
                room.moveRequests.out[container.id] = {
                    type: mineral.mineralType,
                    amount: container.store[mineral.mineralType]
                };
                room.logStore(mineral.mineralType, container.store[mineral.mineralType]);
            }
        }
    }
}

global.mining = (roomName: string, enable: boolean) => {
    let room = myRooms[roomName];
    room.state.enableMining = enable;
    room.delay("updateCreepCount", 1);
}
