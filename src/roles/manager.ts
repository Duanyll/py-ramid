import { TERMINAL_STORE_ENERGY } from "config";
import { RoomInfo } from "roomInfo";
import Logger from "utils/Logger";

const CENTER_STRUCTURES: { [type: string]: boolean } = {
    [STRUCTURE_STORAGE]: true,
    [STRUCTURE_TERMINAL]: true,
    [STRUCTURE_FACTORY]: true,
    [STRUCTURE_POWER_SPAWN]: true,
    [STRUCTURE_NUKER]: true,
    [STRUCTURE_LINK]: true
};

let lastStorageScannedTime: { [room: string]: number } = {};

export function runManager(creep: Creep, room: RoomInfo) {
    if (!creep) return;
    let m = creep.memory;
    const storage = room.structures.storage;
    const terminal = room.structures.terminal;
    let resInfo = room.resource;
    if (m.target) {
        let target = Game.getObjectById(m.target) as AnyStoreStructure;
        if (!CENTER_STRUCTURES[target.structureType]) {
            Logger.error(`${room.name}: Manager error.`);
            target = room.structures.storage;
        }
        for (const res in creep.store) {
            creep.transfer(target, res as ResourceConstant);
        }
        delete m.target;
    } else {
        if (room.structures.centerLink.store.getFreeCapacity(RESOURCE_ENERGY) <= 400) {
            m.target = storage.id;
            creep.withdraw(room.structures.centerLink, RESOURCE_ENERGY);
            return;
        } else if (!lastStorageScannedTime[room.name] || Game.time - lastStorageScannedTime[room.name] > 20) {
            // 先把资源从 terminal 放进 storage 里(reserve 或超过了 export 的量)
            const storageAmount = (res: ResourceConstant) => Math.min(
                creep.store.getCapacity(),
                terminal.store.getUsedCapacity(res),
                Math.max(
                    (resInfo.reserve[res] || 0) - storage.store.getUsedCapacity(res),
                    (resInfo.export[res]) ? (terminal.store.getUsedCapacity(res) - resInfo.export[res]) : 0
                )
            )
            for (const res in terminal.store) {
                if (res == RESOURCE_ENERGY) continue;
                let amount = storageAmount(res as ResourceConstant);
                if (amount > 0) {
                    creep.withdraw(terminal, res as ResourceConstant, amount);
                    m.target = storage.id;
                    return;
                }
            }

            // 再从 storage 给 terminal 补货
            const terminalAmount = (res: ResourceConstant) => Math.min(
                creep.store.getCapacity(),
                storage.store.getUsedCapacity(res) - (resInfo.reserve[res] || 0),
                (resInfo.export[res] || 0) - terminal.store[res],
            );
            for (const res in storage.store) {
                if (res == RESOURCE_ENERGY) continue;
                let amount = terminalAmount(res as ResourceConstant);
                if (amount > 0) {
                    creep.withdraw(storage, res as ResourceConstant, amount);
                    m.target = terminal.id;
                    return;
                }
            }
            lastStorageScannedTime[room.name] = Game.time;
        } else if (room.state.energyState == "take") {
            if (terminal.store.getUsedCapacity(RESOURCE_ENERGY) < TERMINAL_STORE_ENERGY) {
                creep.withdraw(storage, RESOURCE_ENERGY);
                m.target = terminal.id;
                return;
            } else if (room.structures.nuker?.store.getFreeCapacity(RESOURCE_ENERGY) && room.state.chargeNuker) {
                creep.withdraw(storage, RESOURCE_ENERGY);
                m.target = room.structures.nuker.id;
                return;
            }
        } else if (room.structures.nuker?.store.getFreeCapacity(RESOURCE_GHODIUM) > 0
            && storage.store.getUsedCapacity(RESOURCE_GHODIUM) > 0) {
            let amount = Math.min(
                room.structures.nuker?.store.getFreeCapacity(RESOURCE_GHODIUM),
                storage.store.getUsedCapacity(RESOURCE_GHODIUM),
                creep.store.getCapacity());
            creep.withdraw(storage, RESOURCE_GHODIUM, amount);
            m.target = room.structures.nuker.id;
        };
    }
}
