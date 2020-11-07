import { registerCallback, RoomInfo } from "roomInfo";
import { tickSpawn } from "spawn";
import { tickTower } from "tower";
import { runManager } from "manager";
import { ROOM_STORE_ENERGY, ROOM_LEAST_STORE_ENERGY, TERMINAL_MINERAL } from "config";
import { creepRolesForLevel, minerBody } from "creepCount";
import { registerCreepRole, runCreep } from "creep";
import { runBuilder } from "roleBuilder";
import { runCarrier, runRefiller } from "roleCarrier";
import { runHarvester, runRemoteBuilder, runRemoteCarrier, runRemoteHarvester, runRemoteReserver } from "roleHarvester";
import { runUpgrader } from "roleUpgrader";
import { runEmergencyWorker, runWorker } from "roleWorker";
import "labs"
import "link"
import "defense"
import { runMiner } from "roleMiner";

function updateRoomCreepCount(room: RoomInfo) {
    room.creepRoleDefs = _.clone(creepRolesForLevel[room.structRcl]);
    if (room.structRcl >= 7 && (room.state.energyState == "store")) {
        delete room.creepRoleDefs["build1"];
    }
    if (room.structRcl == 8 && room.state.energyMode != "wall") {
        delete room.creepRoleDefs["build1"];
    }
    if (room.structRcl >= 6 && room.state.enableMining && room.structures.mineral.mineralAmount
        && room.countResource(room.structures.mineral.mineralType) < TERMINAL_MINERAL) {
        room.creepRoleDefs["mine1"] = {
            body: minerBody,
            role: "mine"
        }
    }
    room.delay("updateCreepCount", 100);
}
registerCallback("updateCreepCount", updateRoomCreepCount);

registerCreepRole({
    build: runBuilder,
    carry: runCarrier,
    harvest: runHarvester,
    rhHarv: runRemoteHarvester,
    rhCarry: runRemoteCarrier,
    rhReserve: runRemoteReserver,
    rhBuild: runRemoteBuilder,
    upgrade: runUpgrader,
    work: runWorker,
    emergency: runEmergencyWorker,
    manage: runManager,
    mine: runMiner
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
            room.delay("updateCreepCount", 0);
        }
        if (room.state.energyState == "take" && room.structures.storage.store.energy < ROOM_LEAST_STORE_ENERGY) {
            room.state.energyState = "store";
            room.delay("updateCreepCount", 0);

        }
    }

    room.tickTasks();

    room.creeps.forEach(c => {
        runCreep(c, room);
    })

    tickSpawn(room);
    tickTower(room);
}

function onRclUpgrade(room: RoomInfo) {
    console.log(`Room ${room.name} ungraded to level ${room.detail.controller.level}.`)
    room.delay("setConstruction", 1);
    room.delay("checkRoads", 1);
    room.delay("checkRefill", 1);
    if (room.structures.controller.level >= 8) room.state.energyMode = "wall";
}
