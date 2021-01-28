import { RoomInfo } from "room/roomInfo";
import { moveCreepTo } from "creep/movement";

function selectRefillTarget(creep: Creep, room: RoomInfo) {
    let target = "";
    let dis = Infinity;
    for (const id in room.refillTargets) {
        if (room.refillTargets[id] == 0) {
            continue;
        }
        const cur = (Game.getObjectById(id) as RoomObject).pos.getRangeTo(creep);
        if (cur < dis) {
            dis = cur;
            target = id;
        }
    }
    return target;
}

export function goRefill(creep: Creep, room: RoomInfo) {
    let refilled = false;
    let nearByTargets: RefillableStructure[];
    let nextTarget: RefillableStructure;
    do {
        if (creep.memory.target && room.refillTargets[creep.memory.target]) {
            const s = Game.getObjectById(creep.memory.target) as RefillableStructure;
            if (creep.pos.isNearTo(s)) {
                if (refilled) return true;
                const amount = Math.min(creep.store.energy, s.store.getFreeCapacity(RESOURCE_ENERGY));
                creep.transfer(s, RESOURCE_ENERGY, amount);
                if (amount >= s.store.getFreeCapacity(RESOURCE_ENERGY)) {
                    delete room.refillTargets[s.id];
                } else {
                    room.refillTargets[s.id] = s.store.getFreeCapacity(RESOURCE_ENERGY) - amount;
                }
                refilled = true;
                if (amount >= creep.store.energy) {
                    delete creep.memory.target;
                    return true;
                }
            } else {
                moveCreepTo(creep, s);
                return true;
            }
        }
        if (!nearByTargets) {
            nearByTargets = [];
            let dis = Infinity;
            for (const id in room.refillTargets) {
                if (room.refillTargets[id] == 0) {
                    continue;
                }
                const s = (Game.getObjectById(id) as RefillableStructure);
                const cur = s.pos.getRangeTo(creep);
                if (cur <= 1) {
                    nearByTargets.push(s);
                } else if (cur < dis) {
                    dis = cur;
                    nextTarget = s;
                }
            }
        }
        if (nearByTargets.length > 0) {
            creep.memory.target = nearByTargets.pop().id;
        } else if (nextTarget) {
            creep.memory.target = nextTarget.id;
        } else {
            delete creep.memory.target;
            return false;
        }
    } while (creep.memory.target);
    return false;
}

export function runRefiller(creep: Creep, room: RoomInfo) {
    if (creep.store.energy == 0) {
        let target = room.detail.find(FIND_TOMBSTONES).filter(t => t.store.energy > 100 && t.creep.my)[0]
            || room.detail.find(FIND_RUINS).filter(r => r.store.energy > 0)[0]
            || room.structures.storage;
        if (creep.pos.isNearTo(target)) {
            creep.withdraw(target, RESOURCE_ENERGY);
        } else {
            moveCreepTo(creep, target);
        }

    } else {
        goRefill(creep, room);
    }
}

interface CarrierMemory extends CreepMemory {
    state: "pick" | "fill" | "idle",
    // 没有 type 表示取走所有资源
    type?: ResourceConstant,
    amount?: number
}

export function runCarrier(creep: Creep, room: RoomInfo) {
    let m = creep.memory as CarrierMemory;
    m.state = m.state || "idle";
    const storage = room.structures.storage;
    const terminal = room.structures.terminal;
    if (m.state == "idle") {
        let needRefill = _.size(room.refillTargets) > 0;
        // 优先填 spawn
        if (needRefill) {
            runRefiller(creep, room);
        } else if (creep.store.getUsedCapacity()) {
            // 返还身上多余能量
            if (creep.pos.isNearTo(storage)) {
                for (const resourceType in creep.store) {
                    creep.transfer(storage, resourceType as ResourceConstant);
                }
            } else {
                moveCreepTo(creep, storage);
            }
        } else {
            // 先看看有没有需要取出的
            let pickTarget = _.findKey(room.moveRequests.out);
            if (pickTarget) {
                m.state = "pick";
                m.target = pickTarget;
                m.type = room.moveRequests.out[pickTarget].type;
                m.amount = room.moveRequests.out[pickTarget].amount;
            } else {
                // 再根据放入的需求去仓库拿
                let fillTarget = _.findKey(room.moveRequests.in, (info) => {
                    return storage.store[info.type] > 0 || terminal.store[info.type] > 0;
                });
                if (fillTarget) {
                    m.state = "pick";
                    m.type = room.moveRequests.in[fillTarget].type;
                    m.target = (terminal.store[m.type] > 0) ? terminal.id : storage.id;
                    m.amount = room.moveRequests.in[fillTarget].amount;
                }
            }
        }
    } else if (m.state == "pick") {
        let target = Game.getObjectById(m.target) as AnyStoreStructure;
        // 判断 target 丢失的情况
        if (!target || (m.target != storage.id && m.target != terminal.id && !room.moveRequests.out[m.target])) {
            m.state = "idle";
            return;
        } else {
            if (creep.pos.isNearTo(target)) {
                let actualAmount = 0;
                if (m.type) {
                    actualAmount = Math.min(m.amount, creep.store.getFreeCapacity(), target.store[m.type]);
                    creep.withdraw(target, m.type, actualAmount);
                    if (room.moveRequests.out[m.target]) {
                        room.moveRequests.out[m.target].amount -= actualAmount;
                        if (room.moveRequests.out[m.target].amount <= 0) {
                            delete room.moveRequests.out[m.target];
                        }
                    }
                } else {
                    for (const type in target.store) {
                        creep.withdraw(target, type as ResourceConstant);
                    }
                    if (_.sum(_.values(target.store)) <= creep.store.getFreeCapacity())
                        delete room.moveRequests.out[m.target];
                }

                // 找一个需要该资源的建筑，没有就放进仓库
                let fillTarget = terminal?.id || storage.id as string;
                if (m.type) {
                    let directfill = _.findKey(room.moveRequests.in, (info) => {
                        return info.type == m.type;
                    });
                    if (directfill) fillTarget = directfill;
                }
                m.target = fillTarget;
                m.state = "fill";
                m.amount = actualAmount;
                return;
            } else {
                moveCreepTo(creep, target);
            }
        }
    } else {
        let target = Game.getObjectById(m.target) as AnyStoreStructure;
        // 如果目标丢失就放进仓库
        if (!target || (m.target != storage.id && !room.moveRequests.in[m.target])) {
            m.target = storage.id;
            target = storage;
        }

        if (creep.pos.isNearTo(target)) {
            let actualAmount = 0;
            if (m.type) {
                actualAmount = room.moveRequests.in[m.target] ?
                    Math.min(room.moveRequests.in[m.target].amount, creep.store[m.type]) :
                    creep.store[m.type];
                creep.transfer(target, m.type, actualAmount);
                if (room.moveRequests.in[m.target]) {
                    room.moveRequests.in[m.target].amount -= actualAmount;
                    if (room.moveRequests.in[m.target].amount <= 0) {
                        delete room.moveRequests.in[m.target];
                    }
                }
            } else {
                for (const type in creep.store) {
                    creep.transfer(target, type as ResourceConstant);
                }
                delete room.moveRequests.in[m.target];
            }
            // 取到的太多的也要放回仓库
            if (m.type && actualAmount < creep.store[m.type]) {
                m.target = storage.id;
                delete m.type;
            } else {
                m.state = "idle";
            }
            return;
        } else {
            moveCreepTo(creep, target);
        }
    }
}

