import { registerRoomRoutine, RoomInfo } from "roomInfo";
import { tickSpawn } from "structures/spawn";
import { tickTower } from "structures/tower";
import { TERMINAL_MINERAL } from "config";
import { creepRolesForLevel, minerBody } from "creepCount";
import { runCreep } from "creep";
import "structures/labs"
import "structures/link"
import "defense"
import "roles"
import "structures/powerSpawn"
import Logger from "utils/Logger";

function updateRoomCreepCount(room: RoomInfo) {
    room.creepRoleDefs = _.clone(creepRolesForLevel[room.structRcl]);
    if (room.structRcl >= 7 && (room.state.energy.storeMode)) {
        delete room.creepRoleDefs["build1"];
    }
    if (room.structRcl == 8 && !room.state.energy.usage.builder) {
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

function decideRoomEnergyUsage(room: RoomInfo) {
    if (!room.structures.storage) return;
    const storeEnergy = room.structures.storage.store.energy;
    let config = room.state.energy;
    function end() {
        config.activeCount = _.compact(_.values(config.usage)).length;
        room.delay("updateCreepCount", 1);
        if (config.usage.power) room.delay("runPowerSpawn", 1);
        Logger.silly(`${room.name} update energy mode: ${JSON.stringify(config.usage)}`);
    }
    if (config.storeMode && storeEnergy > 120000) {
        let work = config.primary.shift();
        config.primary.push(work);
        config.storeMode = false;
        config.usage = { [work]: true };
        return end();
    }

    if (!config.storeMode && storeEnergy < 100000) {
        config.storeMode = true;
        config.usage = {};
        return end();
    }

    if (!config.storeMode && storeEnergy > 140000 && config.activeCount < 2) {
        function findSecondaryWork(): EnergyWork | false {
            if (!config.usage.builder) return "builder";
            if (!config.usage.power && room.structures.powerSpawn) return "power";
            if (!config.usage.battery && room.structures.factory) return "battery";
            if (!config.usage.upgrade) return "upgrade";
            return false;
        }
        let secondary = findSecondaryWork();
        if (secondary) {
            config.usage[secondary] = true;
            config.activeCount = 2;
            return end();
        }
    }
}

export function tickNormalRoom(room: RoomInfo) {
    room.loadStructures();
    if (!room.detail.memory.rcl || room.detail.memory.rcl < room.detail.controller.level) {
        onRclUpgrade(room);
    }
    room.detail.memory.rcl = room.detail.controller.level;

    decideRoomEnergyUsage(room);

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
}
