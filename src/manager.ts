import { TERMINAL_STORE_ENERGY } from "config";
import { RoomInfo } from "roomInfo";

const CENTER_STRUCTURES: { [type: string]: boolean } = {
    [STRUCTURE_STORAGE]: true,
    [STRUCTURE_TERMINAL]: true,
    [STRUCTURE_FACTORY]: true,
    [STRUCTURE_POWER_SPAWN]: true,
    [STRUCTURE_NUKER]: true,
    [STRUCTURE_LINK]: true
};

function whereToPutEnergy(room: RoomInfo) {
    if (room.state.energyState == "store") {
        return room.structures.storage.id;
    } else if (room.structures.terminal.store.energy < TERMINAL_STORE_ENERGY) {
        return room.structures.terminal.id;
    } else if (room.structures.nuker?.store.getFreeCapacity(RESOURCE_ENERGY)) {
        return room.structures.nuker.id;
    } else if (room.structures.powerSpawn?.store.energy <= 4200) {
        return room.structures.powerSpawn.id;
    } else {
        return room.structures.storage.id;
    }
}

let lastStorageScannedTime: { [room: string]: number } = {};

export function runManager(creep: Creep, room: RoomInfo) {
    if (!creep) return;
    let m = creep.memory;
    if (m.target) {
        let target = Game.getObjectById(m.target) as AnyStoreStructure;
        if (!CENTER_STRUCTURES[target.structureType]) {
            console.log(`${room.name}: Manager error.`);
            target = room.structures.storage;
        }
        for (const res in creep.store) {
            creep.transfer(target, res as ResourceConstant);
        }
        delete m.target;
    } else {
        if (room.structures.centerLink.store.getFreeCapacity(RESOURCE_ENERGY) <= 400) {
            m.target = whereToPutEnergy(room);
            creep.withdraw(room.structures.centerLink, RESOURCE_ENERGY);
            return;
        } else if (!lastStorageScannedTime[room.name] || Game.time - lastStorageScannedTime[room.name] > 20) {
            for (const res in room.structures.terminal.store) {
                if (room.structures.storage.store.getUsedCapacity(res as ResourceConstant) < room.resource.reserve[res]) {
                    creep.withdraw(room.structures.terminal, res as ResourceConstant, Math.min(creep.store.getCapacity(),
                        room.resource.reserve[res] - room.structures.storage.store.getUsedCapacity(res as ResourceConstant),
                        room.structures.terminal.store.getUsedCapacity(res as ResourceConstant)
                    ));
                    m.target = room.structures.storage.id;
                    return;
                }
            }

            for (const res in room.structures.storage.store) {
                if (room.structures.storage.store.getUsedCapacity(res as ResourceConstant) > room.resource.reserve[res]) {
                    creep.withdraw(room.structures.storage, res as ResourceConstant, Math.min(creep.store.getCapacity(),
                        room.structures.storage.store.getUsedCapacity(res as ResourceConstant) - room.resource.reserve[res]
                    ));
                    m.target = room.structures.terminal.id;
                    return;
                }
            }
            lastStorageScannedTime[room.name] = Game.time;
        }
    }
}
