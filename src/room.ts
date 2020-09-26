import { RoomInfo } from "roomInfo";
import { tickCarrier } from "roleCarrier";
import { tickSpawn } from "spawn";
import { tickBuilder } from "roleBuilder";
import { tickHarvester } from "roleHarvester";
import { tickUpgrader } from "roleUpgrader";
import { tickWorker } from "roleWorker";
import { tickTower } from "tower";
import { tickLink } from "link";
import { tickManager } from "manager";
import { ROOM_STORE_ENERGY, ROOM_LEAST_STORE_ENERGY } from "config";

export function tickRoom(room: RoomInfo) {
    room.loadStructures();
    room.updateCreepCount();
    if (!room.detail.memory.rcl || room.detail.memory.rcl < room.detail.controller.level) {
        onRclUpgrade(room);
    }
    room.detail.memory.rcl = room.detail.controller.level;


    if (room.structures.storage) {
        if (room.state.energyState == "store" && room.structures.storage.store.energy > ROOM_STORE_ENERGY) {
            room.state.energyState = "take";
        }
        if (room.state.energyState == "take" && room.structures.storage.store.energy < ROOM_LEAST_STORE_ENERGY) {
            room.state.energyState = "store";
        }
    }

    room.tickTasks();

    tickWorker(room);
    tickBuilder(room);
    tickManager(room);
    tickCarrier(room);
    tickHarvester(room);
    tickUpgrader(room);

    tickSpawn(room);
    tickTower(room);
    tickLink(room);
}

function onRclUpgrade(room: RoomInfo) {
    console.log(`Room ${room.name} ungraded to level ${room.detail.controller.level}.`)
    room.delay("setConstruction", 1);
    room.delay("checkRoads", 1);
    room.delay("checkRefill", 1);
}
