import { moveCreepTo } from "moveHelper";
import { myRooms, RoomInfo } from "roomInfo";

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

global.mining = (roomName: string, enable: boolean) => {
    let room = myRooms[roomName];
    room.state.enableMining = enable;
    room.delay("updateCreepCount", 1);
}
