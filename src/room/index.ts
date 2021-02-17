import { myRooms, registerRoomRoutine, RoomInfo } from "room/roomInfo";
import { tickSpawn } from "structures/spawn";
import { tickTower } from "structures/tower";
import { runCreep } from "creep";
import "room/defense"
import Logger from "utils";
import cfg from "config";
import { roleBodies, roomBasicCreepConfig } from "creep/body";

function decideRoomEnergyUsage(room: RoomInfo) {
    if (!room.structures.storage) return;
    const storeEnergy = room.energy;
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
        config.primaryUpdateTime = Game.time;
        return end();
    }

    if (!config.storeMode && storeEnergy < 100000) {
        config.storeMode = true;
        config.usage = {};
        return end();
    }

    if (!config.storeMode && (storeEnergy > 140000 || Game.time - config.primaryUpdateTime > 3000) && config.activeCount < 2) {
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
            return end();
        }
    }

    if (!config.storeMode && storeEnergy > 200000) {
        if (!config.usage.upgrade) {
            config.usage.upgrade = true;
            return end();
        }
    }
}

export function tickNormalRoom(room: RoomInfo) {
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

function updateRoomCreepCount(room: RoomInfo) {
    room.creepRoleDefs = _.clone(roomBasicCreepConfig[room.structRcl]);
    if (room.structRcl >= 7 && (room.state.energy.storeMode)) {
        delete room.creepRoleDefs["build1"];
    }
    if (room.structRcl == 8 && !room.state.energy.usage.builder) {
        delete room.creepRoleDefs["build1"];
    }
    if (room.structRcl >= 6 && room.state.enableMining && room.structures.mineral.mineralAmount
        && room.storeCurrent.get(room.structures.mineral.mineralType) < cfg.TERMINAL_MINERAL) {
        room.creepRoleDefs["mine1"] = {
            body: roleBodies["mine"],
            role: "mine"
        }
    }
    if (room.structRcl >= 8 && !room.state.energy.usage.upgrade) {
        room.creepRoleDefs["upgr1"] = {
            body: [[WORK, 3], [CARRY, 1], [MOVE, 2]],
            role: "upgrade"
        }
    }
}
registerRoomRoutine({
    id: "updateCreepCount",
    dependsOn: ["countStore"],
    init: updateRoomCreepCount,
    invoke: updateRoomCreepCount,
});


global.unclaim = (roomName: string, keep?: boolean) => {
    if (!myRooms[roomName]) {
        Logger.error(`${roomName} is not owned!`);
    } else {
        let message = `Unclaiming ${roomName} (Level: ${myRooms[roomName].structRcl}, mineral: ${myRooms[roomName].structures.mineral.mineralType}), `;
        message += keep ? "keep structures and memory." : "clean up everything.";
        message += "\nMake sure every task is cleared!"
        Logger.confirm(
            message,
            `unclaim ${roomName}`,
            () => {
                let room = myRooms[roomName];
                room.creeps.forEach(c => c.suicide());
                room.detail.find(FIND_CONSTRUCTION_SITES).forEach(c => c.remove());
                if (!keep) {
                    room.detail.find(FIND_STRUCTURES).forEach(s => s.destroy());
                    delete Memory.rooms[roomName];
                }
                room.structures.controller.unclaim();
                global.reloadRoomsNextTick = true;
            }
        )
    }
}

function checkRoomPower(room: RoomInfo) {
    let nextRun = false;
    if (room.powerAvaliable[PWR_REGEN_SOURCE]) {
        _.forEach(room.structures.sources, s => room.requestPower(s, PWR_REGEN_SOURCE));
        nextRun = true;
    }
    if (room.powerAvaliable[PWR_REGEN_MINERAL]) {
        if (!room.structures.mineral.ticksToRegeneration)
            room.requestPower(room.structures.mineral, PWR_REGEN_MINERAL);
        nextRun = true;
    }
    if (nextRun) room.delay("checkPower");
}
registerRoomRoutine({
    id: "checkPower",
    init: checkRoomPower,
    invoke: checkRoomPower
});
