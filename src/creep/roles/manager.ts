import cfg from "config";
import { RoomInfo } from "room/roomInfo";
import Logger from "utils";

const CENTER_STRUCTURES: { [type: string]: boolean } = {
    [STRUCTURE_STORAGE]: true,
    [STRUCTURE_TERMINAL]: true,
    [STRUCTURE_FACTORY]: true,
    [STRUCTURE_POWER_SPAWN]: true,
    [STRUCTURE_NUKER]: true,
    [STRUCTURE_LINK]: true
};

let lastStorageScannedTime: { [room: string]: number } = {};

const managerTasks: ((room: RoomInfo, storage: StructureStorage, capacity: number) =>
    (false | { from: AnyStoreStructure, to: AnyStoreStructure, type: ResourceConstant, amount?: number }))[] = [
        (room, storage) => {
            if (room.structures.centerLink?.store.getFreeCapacity(RESOURCE_ENERGY) <= 400) {
                return {
                    from: room.structures.centerLink,
                    to: storage,
                    type: RESOURCE_ENERGY
                }
            }
            return false;
        },
        (room, storage) => {
            if (!lastStorageScannedTime[room.name] || Game.time - lastStorageScannedTime[room.name] > 20) {
                const terminal = room.structures.terminal;
                const resInfo = room.resource;
                // 先把资源从 terminal 放进 storage 里(reserve 或超过了 export 的量)
                const storageAmount = (res: ResourceConstant) => Math.min(
                    terminal.store.getUsedCapacity(res),
                    Math.max(
                        (resInfo.reserve[res] || 0) - storage.store.getUsedCapacity(res),
                        (terminal.store.getUsedCapacity(res) - (resInfo.export[res] || cfg.TERMINAL_EXPORT_AMOUNT))
                    )
                )
                for (const res in terminal.store) {
                    if (res == RESOURCE_ENERGY) continue;
                    let amount = storageAmount(res as ResourceConstant);
                    if (amount > 0) {
                        return {
                            from: terminal,
                            to: storage,
                            type: res as ResourceConstant,
                            amount
                        }
                    }
                }

                // 再从 storage 给 terminal 补货
                const terminalAmount = (res: ResourceConstant) => Math.min(
                    storage.store.getUsedCapacity(res) - (resInfo.reserve[res] || 0),
                    (resInfo.export[res] || cfg.TERMINAL_EXPORT_AMOUNT) - terminal.store.getUsedCapacity(res),
                );
                for (const res in storage.store) {
                    if (res == RESOURCE_ENERGY) continue;
                    let amount = terminalAmount(res as ResourceConstant);
                    if (amount > 0) {
                        return {
                            from: storage,
                            to: terminal,
                            type: res as ResourceConstant,
                            amount
                        }
                    }
                }
                lastStorageScannedTime[room.name] = Game.time;
            }
            return false;
        },
        (room, storage) => {
            if (!room.state.energy.storeMode
                && room.structures.terminal?.store.getUsedCapacity(RESOURCE_ENERGY) < cfg.TERMINAL_STORE_ENERGY) {
                return {
                    from: storage,
                    to: room.structures.terminal,
                    type: RESOURCE_ENERGY,
                    amount: cfg.TERMINAL_STORE_ENERGY - room.structures.terminal.store.energy
                }
            }
            return false;
        },
        (room, storage) => {
            if (room.structures.terminal?.store.getUsedCapacity(RESOURCE_ENERGY) > cfg.TERMINAL_STORE_ENERGY) {
                return {
                    from: room.structures.terminal,
                    to: storage,
                    type: RESOURCE_ENERGY,
                    amount: room.structures.terminal.store.energy - cfg.TERMINAL_STORE_ENERGY
                }
            }
            return false;
        },
        (room, storage) => {
            if (!room.state.energy.storeMode && room.state.chargeNuker
                && room.structures.nuker?.store.getUsedCapacity(RESOURCE_ENERGY) < NUKER_ENERGY_CAPACITY) {
                return {
                    from: storage,
                    to: room.structures.nuker,
                    type: RESOURCE_ENERGY
                }
            }
            return false;
        },
        (room, storage, capacity) => {
            if (!room.state.energy.storeMode
                && room.structures.powerSpawn?.store.getFreeCapacity(RESOURCE_ENERGY) >= capacity) {
                room.delay("runPowerSpawn", 2);
                return {
                    from: storage,
                    to: room.structures.powerSpawn,
                    type: RESOURCE_ENERGY
                }
            }
            return false;
        },
        (room, storage) => {
            if (room.structures.nuker?.store.getUsedCapacity(RESOURCE_GHODIUM) < NUKER_GHODIUM_CAPACITY
                && storage.store.getUsedCapacity(RESOURCE_GHODIUM) > 0) {
                return {
                    from: storage,
                    to: room.structures.nuker,
                    type: RESOURCE_GHODIUM
                }
            }
            return false;
        },
        (room, storage) => {
            if (room.structures.powerSpawn?.store.getFreeCapacity(RESOURCE_POWER) >= 80)
                if (storage.store.getUsedCapacity(RESOURCE_POWER) > 0) {
                    room.delay("runPowerSpawn", 2);
                    return {
                        from: storage,
                        to: room.structures.powerSpawn,
                        type: RESOURCE_POWER
                    }
                } else if (room.structures.terminal.store.getUsedCapacity(RESOURCE_POWER) > 0) {
                    room.delay("runPowerSpawn", 2);
                    return {
                        from: room.structures.terminal,
                        to: room.structures.powerSpawn,
                        type: RESOURCE_POWER
                    }
                }
            return false;
        },
        (room, storage, capacity) => {
            const factory = room.structures.factory;
            if (!factory) return false;
            for (const res in factory.store) {
                const amount = factory.store[res as ResourceConstant];
                if (!(room.factoryRequests[res as ResourceConstant])) {
                    if (amount > capacity || res != room.state.factory.product) {
                        return {
                            from: factory,
                            to: storage,
                            type: res as ResourceConstant
                        }
                    }
                }
            }
            for (const r in room.factoryRequests) {
                const res = r as ResourceConstant;
                if (factory.store[res] >= cfg.FACTORY_COMPONENT_AMOUNT) continue;
                if (storage.store[res] > 0) {
                    const amount = Math.min(capacity, storage.store[res], room.factoryRequests[res]);
                    room.factoryRequests[res] -= amount;
                    return {
                        from: storage,
                        to: factory,
                        type: res,
                        amount
                    }
                } else if (room.structures.terminal?.store[res] > 0) {
                    const amount = Math.min(capacity, room.structures.terminal.store[res], room.factoryRequests[res]);
                    room.factoryRequests[res] -= amount;
                    return {
                        from: room.structures.terminal,
                        to: factory,
                        type: res,
                        amount
                    }
                }
            }
            return false;
        }
    ]

export function runManager(creep: Creep, room: RoomInfo) {
    if (!creep) return;
    let m = creep.memory;
    const storage = room.structures.storage;
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
    } else if (creep.ticksToLive >= 2) {
        for (const task of managerTasks) {
            const res = task(room, storage, creep.store.getCapacity());
            if (res) {
                let amount = Math.min(
                    // @ts-expect-error
                    res.from.store.getUsedCapacity(res.type),
                    // @ts-expect-error
                    res.to.store.getFreeCapacity(res.type),
                    creep.store.getCapacity(),
                    res.amount || Infinity
                );
                creep.withdraw(res.from, res.type, amount);
                m.target = res.to.id;
                break;
            }
        }
    }
}
