import { registerRoomRoutine, RoomInfo } from "roomInfo";
import { tickSpawn } from "structures/spawn";
import { tickTower } from "structures/tower";
import { ROOM_STORE_ENERGY, ROOM_LEAST_STORE_ENERGY, TERMINAL_MINERAL } from "config";
import { creepRolesForLevel, minerBody } from "creepCount";
import { runCreep } from "creep";
import "structures/labs"
import "structures/link"
import "defense"
import "roles"

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
registerRoomRoutine("updateCreepCount", updateRoomCreepCount);

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
