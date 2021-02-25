import cfg from "config";
import { RoomInfo } from "room/roomInfo";
import Logger from "utils";
import { CENTER_STRUCTURES } from "utils/constants";

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
                // 先把资源从 terminal 放进 storage 里(reserve 或超过了 export 的量)
                const storageAmount = (res: ResourceConstant) => Math.min(
                    terminal.store.getUsedCapacity(res),
                    Math.max(
                        room.getReserve(res) - storage.store.getUsedCapacity(res),
                        (terminal.store.getUsedCapacity(res) - room.getExport(res))
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
                    storage.store.getUsedCapacity(res) - room.getReserve(res),
                    room.getExport(res) - terminal.store.getUsedCapacity(res),
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
            if (room.structures.nuker?.store.getUsedCapacity(RESOURCE_GHODIUM) < NUKER_GHODIUM_CAPACITY) {
                let s = room.whereToGet("G")
                if (s)
                    return {
                        from: s,
                        to: room.structures.nuker,
                        type: RESOURCE_GHODIUM
                    }
            }
            return false;
        },
        (room, storage) => {
            if (room.structures.powerSpawn?.store.getFreeCapacity(RESOURCE_POWER) >= 80) {
                let s = room.whereToGet("power")
                if (s)
                    return {
                        from: s,
                        to: room.structures.powerSpawn,
                        type: "power"
                    }
            }
            return false;
        },
        (room, storage, capacity) => {
            const factory = room.structures.factory;
            if (!factory) return false;
            const info = room.state.factory;

            if (info.remain > 0) {
                const recipe = COMMODITIES[info.product as CommodityConstant];
                for (const r in factory.store) {
                    if (r in recipe.components) continue;
                    if (r == info.product && factory.store[r as ResourceConstant] < cfg.FACTORY_COMPONENT_AMOUNT) continue;
                    const s = room.whereToPut(r as ResourceConstant);
                    if (s) {
                        return {
                            from: factory,
                            to: s,
                            type: r as ResourceConstant
                        }
                    }
                }
            } else {
                for (const r in factory.store) {
                    const s = room.whereToPut(r as ResourceConstant);
                    if (s) {
                        return {
                            from: factory,
                            to: s,
                            type: r as ResourceConstant
                        }
                    }
                }
            }

            if (info.remain > 0) {
                const recipe = COMMODITIES[info.product as CommodityConstant];
                for (const r in recipe.components) {
                    const remain = (recipe.components as any)[r] * _.ceil(info.remain - recipe.amount);
                    const transfer = Math.min(remain, cfg.FACTORY_COMPONENT_AMOUNT) - factory.store[r as ResourceConstant];
                    if (transfer >= capacity || transfer > 0 && remain < cfg.FACTORY_COMPONENT_AMOUNT) {
                        const s = room.whereToGet(r as ResourceConstant);
                        if (s) {
                            return {
                                from: s,
                                to: factory,
                                type: r as ResourceConstant,
                                amount: transfer
                            }
                        }
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
                    res.from.store.tot(res.type),
                    res.to.store.free(res.type),
                    creep.store.cap(),
                    res.amount || Infinity
                );
                creep.withdraw(res.from, res.type, amount);
                m.target = res.to.id;
                break;
            }
        }
    }
}
