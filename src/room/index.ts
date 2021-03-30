import { myRooms, registerRoomRoutine, RoomInfo } from "room/roomInfo";
import { tickSpawn } from "structures/spawn";
import { tickTower } from "structures/tower";
import { runCreep } from "creep";
import "room/wall"
import Logger from "utils";
import cfg from "config";
import { roleBodies, roomBasicCreepConfig } from "creep/body";
import { registerCommand, runCommand } from "utils/console";
import "./designer";

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

    if (room.state.boostUpgrade) {
        if (!config.storeMode && storeEnergy < cfg.ENERGY.LOW) {
            config.storeMode = true;
            config.usage = {};
            room.state.link.centerMode = "recieve";
            return end();
        } else if (storeEnergy > cfg.ENERGY.FORCE_UPGRADE) {
            config.storeMode = false;
            config.usage.upgrade = true;
            room.state.link.centerMode = "send";
            return end();
        }
        return;
    } else {
        room.state.link.centerMode = "recieve";
    }

    if (config.storeMode && storeEnergy > cfg.ENERGY.PRIMARY_WORK) {
        let work = config.primary.shift();
        config.primary.push(work);
        config.storeMode = false;
        config.usage = { [work]: true };
        config.primaryUpdateTime = Game.time;
        return end();
    }

    if (!config.storeMode && storeEnergy < cfg.ENERGY.LOW) {
        config.storeMode = true;
        config.usage = {};
        return end();
    }

    if (!config.storeMode && (storeEnergy > cfg.ENERGY.SECONDARY_WORK || Game.time - config.primaryUpdateTime > 3000) && config.activeCount < 2) {
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

    if (!config.storeMode && storeEnergy > cfg.ENERGY.FORCE_UPGRADE) {
        if (!config.usage.upgrade) {
            config.usage.upgrade = true;
            return end();
        }
    }

    if (!config.storeMode && storeEnergy > cfg.ENERGY.FORCE_BATTERY) {
        if (!config.usage.battery) {
            config.usage.battery = true;
            return end();
        }
    }
}

export function tickNormalRoom(room: RoomInfo) {
    if (!room.detail.memory.rcl || room.detail.memory.rcl < room.detail.controller.level) {
        onRclUpgrade(room, room.detail.controller.level);
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

function onRclUpgrade(room: RoomInfo, level: number) {
    console.log(`Room ${room.name} ungraded to level ${level}.`);

    if (room.state.boostUpgrade) {
        if (room.detail.controller.level == 5) {
            runCommand("bostUpgrade", room.name, true)
        }

        if (room.detail.controller.level == 8) {
            runCommand("bostUpgrade", room.name, false)
        }
    }
    room.delay("setConstruction", 1);
    room.delay("checkRoads", 1);
    room.delay("checkRefill", 1);
}

registerCommand('boostUpgrade', "enable or disable boost upgrade in a room.", [
    { name: "room", type: "myRoom" },
    { name: "enable", type: "boolean" }
], (roomName: string, enable: boolean) => {
    const room = myRooms[roomName];
    room.state.boostUpgrade = enable;
    if (room.structures.controller.level >= 5) {
        if (enable) {
            const info = {
                type: "energy" as ResourceConstant,
                minPrice: cfg.ENERGY_PRICE / 2,
                maxPrice: cfg.ENERGY_PRICE,
                addPrice: cfg.ENERGY_PRICE / 10,
                buffer: 100_000,
                perOrder: 20_000,
                room: roomName,
                maxStore: 500_000
            }
            let order = _.find(Memory.market.buyOrders, { room: roomName, type: "energy" });
            if (order) {
                _.assign(order, info);
            } else {
                Memory.market.buyOrders.push(info);
            }

            room.state.link.targets = ["controller"];
            room.state.link.centerMode = "send";
        } else {
            _.remove(Memory.market.buyOrders, { room: roomName, type: "energy" });
            room.state.link.targets = ["controller", "center"];
            room.state.link.centerMode = "recieve";
        }
    }
})

function updateRoomCreepCount(room: RoomInfo) {
    room.creepRoleDefs = _.clone(roomBasicCreepConfig[room.structRcl]);
    if (room.structRcl >= 7 && (room.state.energy.storeMode)) {
        delete room.creepRoleDefs["build1"];
    }
    if (room.structRcl == 8 && !room.state.energy.usage.builder) {
        delete room.creepRoleDefs["build1"];
    }
    if (room.structures.mineralContainer && room.state.enableMining && room.structures.mineral.mineralAmount
        && room.storeCurrent.get(room.structures.mineral.mineralType) < cfg.TERMINAL_MINERAL) {
        room.creepRoleDefs["mine1"] = {
            body: roleBodies["mine"][room.structRcl] as BodyPartDescription,
            role: "mine"
        }
    }
    if (room.structRcl >= 6
        && room.state.boostUpgrade
        && room.storeCurrent.get('XGH2O') > 10000
        && room.state.energy.usage.upgrade) {
        room.creepRoleDefs["upgr1"] = {
            body: roleBodies["xUpgrade"][room.structRcl] as BodyPartDescription,
            role: "xUpgrade"
        }
        room.creepRoleDefs["upgr2"] = {
            body: roleBodies["xUpgrade"][room.structRcl] as BodyPartDescription,
            role: "xUpgrade"
        }
        if (room.detail.find(FIND_MY_CONSTRUCTION_SITES).length == 0) {
            delete room.creepRoleDefs["build1"];
        }
    } else if (room.structRcl >= 8 && !room.state.energy.usage.upgrade) {
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


registerCommand('unclaim', 'Unclaim the room immediately!', [
    { name: "room", type: "myRoom" },
    { name: "keep", type: "boolean", description: 'Should keep structures and memory' }
], (roomName: string, keep?: boolean) => {
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
});

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
