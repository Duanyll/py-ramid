import cfg from "config";
import { RoomInfo } from "room/roomInfo";
import Logger from "utils";
import { CENTER_STRUCTURES } from "utils/constants";

export function whereToPut(room: RoomInfo, res: ResourceConstant) {
    const storage = room.structures.storage;
    const terminal = room.structures.terminal;
    if (!terminal) return storage;
    if (res != RESOURCE_ENERGY) {
        const reserveAmount = room.resource.reserve[res] ?? 0;
        if (storage.store[res] < reserveAmount) return storage;
        const exportAmount = room.resource.export[res] || cfg.TERMINAL_EXPORT_AMOUNT;
        if (terminal.store[res] < exportAmount) return terminal;
        return storage;
    } else {
        if (storage.store.energy < cfg.ENERGY.LOW) return storage;
        if (terminal.store.energy < cfg.ENERGY.TERMINAL) return terminal;
        return storage;
    }
}

export function whereToGet(room: RoomInfo, res: ResourceConstant) {
    const storage = room.structures.storage;
    const terminal = room.structures.terminal;
    if (res == RESOURCE_ENERGY) return storage;
    if (!terminal || terminal.store[res] <= 0) return storage.store[res] ? storage : undefined;
    const reserveAmount = room.resource.reserve[res] ?? 0;
    if (storage.store[res] > reserveAmount) {
        return storage;
    } else {
        return terminal;
    }
}

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
                && room.structures.terminal?.store.getUsedCapacity(RESOURCE_ENERGY) < cfg.ENERGY.TERMINAL) {
                return {
                    from: storage,
                    to: room.structures.terminal,
                    type: RESOURCE_ENERGY,
                    amount: cfg.ENERGY.TERMINAL - room.structures.terminal.store.energy
                }
            }
            return false;
        },
        (room, storage) => {
            if (room.structures.terminal?.store.getUsedCapacity(RESOURCE_ENERGY) > cfg.ENERGY.TERMINAL) {
                return {
                    from: room.structures.terminal,
                    to: storage,
                    type: RESOURCE_ENERGY,
                    amount: room.structures.terminal.store.energy - cfg.ENERGY.TERMINAL
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
        if (!(target.structureType in CENTER_STRUCTURES)) {
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
