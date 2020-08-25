import { RoomInfo, runCallback } from "roomInfo";
import { tickCarrier } from "roleCarrier";
import { tickSpawn } from "spawn";
import { tickBuilder } from "roleBuilder";
import { tickHarvester } from "roleHarvester";
import { tickUpgrader } from "roleUpgrader";
import { tickWorker } from "roleWorker";

export function tickRoom(room: RoomInfo) {
    room.detail = Game.rooms[room.name];
    room.reloadStructures();
    if (!room.detail.memory.rcl || room.detail.memory.rcl < room.detail.controller.level) {
        resetCallback(room);
    }
    room.detail.memory.rcl = room.detail.controller.level;

    room.tickEvents();

    tickWorker(room);
    tickBuilder(room);
    tickCarrier(room);
    tickHarvester(room);
    tickUpgrader(room);

    tickSpawn(room);
}

function resetCallback(room: RoomInfo) {
    const callbackToClear: CallbackType[] = [
        "summatyStats", "checkCreepHealth", "setConstruction"
    ]
    for (const tick in room.eventTimer) {
        room.eventTimer[tick] = _.filter(room.eventTimer[tick], (c) => !(_.contains(callbackToClear, c.type)));
    }

    // runCallback({ type: "summatyStats" }, room);
    Object.keys(room.creepRoleDefs).forEach((id) => runCallback({ type: "checkCreepHealth", param: [id] }, room));
    runCallback({ type: "setConstruction" }, room);
}
