import { RoomInfo, runCallback } from "roomInfo";
import { tickCarrier } from "roleCarrier";
import { tickSpawn } from "spawn";

export function tickRoom(room: RoomInfo) {
    room.tickEvents();

    tickCarrier(room);

    tickSpawn(room);
}

function resetLoopEvents(room: RoomInfo) {
    const loopCallbacklist: LoopCallback[] = [
        "summatyStats", "checkCreepHealth"
    ]
    for (const tick in room.eventTimer) {
        room.eventTimer[tick] = _.filter(room.eventTimer[tick], (c) => !(_.contains(loopCallbacklist, c.type)));
    }

    // 自动定时循环调用型
    runCallback({ type: "summatyStats", param: [] }, room);
    Object.keys(room.creepRoleDefs).forEach((id) => runCallback({ type: "checkCreepHealth", param: [id] }, room));
}
