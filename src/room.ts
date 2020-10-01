import { RoomInfo } from "roomInfo";
import { tickSpawn } from "spawn";
import { tickTower } from "tower";
import { tickLink } from "link";
import { runManager } from "manager";
import { ROOM_STORE_ENERGY, ROOM_LEAST_STORE_ENERGY } from "config";
import { creepRolesForLevel } from "creepCount";
import { registerCreepRole, runCreep } from "creep";
import { runBuilder } from "roleBuilder";
import { runRefiller } from "roleCarrier";
import { runHarvester, runRemoteBuilder, runRemoteCarrier, runRemoteHarvester, runRemoteReserver } from "roleHarvester";
import { runUpgrader } from "roleUpgrader";
import { runEmergencyWorker, runWorker } from "roleWorker";

function updateRoomCreepCount(room: RoomInfo) {
    room.creepRoleDefs = _.clone(creepRolesForLevel[room.structRcl]);
    if (room.structRcl >= 7 && room.state.energyState == "store") {
        room.creepRoleDefs["build1"] = undefined;
    }
}

registerCreepRole({
    build: runBuilder,
    carry: runRefiller,
    harvest: runHarvester,
    rhHarv: runRemoteHarvester,
    rhCarry: runRemoteCarrier,
    rhReserve: runRemoteReserver,
    rhBuild: runRemoteBuilder,
    upgrade: runUpgrader,
    work: runWorker,
    emergency: runEmergencyWorker,
    manage: runManager
});

export function tickNormalRoom(room: RoomInfo) {
    room.loadStructures();
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
    updateRoomCreepCount(room);

    room.tickTasks();

    room.creeps.forEach(c => {
        runCreep(c, room);
    })

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
