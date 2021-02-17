import { RoomInfo } from "room/roomInfo";
import { moveCreepTo } from "creep/movement";
import { whereToGet, whereToPut } from "./manager";

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

// 需要将 runRefiller 逻辑完全独立出来，以便其他 creep 顶替 carrier
export function runRefiller(creep: Creep, room: RoomInfo) {
    if (creep.store.energy == 0) {
        let target = room.tombstones.filter(t => t.store.energy > 100 && t.creep.my)[0]
            || room.detail.find(FIND_RUINS).filter(r => r.store.energy > 0)[0]
            || room.structures.storage;
        if (creep.pos.isNearTo(target)) {
            creep.withdraw(target, RESOURCE_ENERGY);
        } else {
            creep.goTo(target);
        }
        return true;
    } else {
        return goRefill(creep, room);
    }
}

interface CarrierMemory extends CreepMemory {
    /**
     * - pick: 取货
     * - fill: 放下
     * - refill: 填 extension
     * - pickToFill: 从 storage 或 terminal 取货，target 是要放入的对象，需要有 amount 参数
     * - idle: 闲置
     */
    state: "pick" | "fill" | "refill" | "pickToFill" | "idle",
    /** 没有 type 表示取走或放下所有资源 */
    type?: ResourceConstant,
    amount?: number
}

function nextCarrierAction(creep: Creep, room: RoomInfo) {
    const m = creep.memory as CarrierMemory;
    const storage = room.structures.storage;
    const terminal = room.structures.terminal;

    // 装满了
    if (m.type && creep.store.free() <= 100) {
        m.target = whereToPut(room, m.type).id;
        m.type = null;
        m.state = "fill";
        creep.say("🔙")
        return;
    }
    // 无类型的取货任务直接返回，也可能是才填过 extension 的情况
    if (!m.type && creep.store.tot()) {
        m.target = room.structures.storage.id;
        m.state = "fill";
        creep.say("🔙")
        return;
    }

    // 填 extension
    if (!_.isEmpty(room.refillTargets)) {
        m.type = null;
        m.state = "refill";
        m.target = null;
        creep.say("🟡")
        return;
    }

    // 取货任务，尝试取同种货物
    if (m.type) {
        const target = _.find(room.moveOutReqs, i => {
            if (i.center) return false;
            if (i.type != m.type) return false;
            let s = Game.getObjectById(i.id) as AnyStoreStructure;
            return s?.store[i.type] > i.max;
        });
        if (target) {
            // 还有同种类型的取货任务
            m.target = target.id;
            m.state = "pick";
            creep.say("🚚")
            return;
        } else {
            // 没有了，放回去
            m.target = whereToPut(room, m.type).id;
            m.type = null;
            m.state = "fill";
            creep.say("🔙")
            return;
        }
    }

    // 尝试获取新的取货任务
    const pickTask = _.find(room.moveOutReqs, i => {
        if (i.center) return false;
        let s = Game.getObjectById(i.id) as AnyStoreStructure;
        return i.type ? (s?.store[i.type] > i.max) : (s != null);
    });
    if (pickTask) {
        m.state = "pick";
        m.target = pickTask.id;
        m.type = pickTask.type;
        creep.say("🚚")
        return;
    }

    // 执行装填任务
    const pickToFillTask = _.find(room.moveInReqs, i => {
        if (i.center) return false;
        if (i.remain <= 0) return false;
        if (storage.store[i.type] + terminal.store[i.type] <= 0) return false;
        const s = Game.getObjectById(i.id) as AnyStoreStructure;
        return s.store[i.type] < i.min;
    });
    if (pickToFillTask) {
        m.state = "pickToFill";
        creep.say("🧱");
        m.type = pickToFillTask.type;
        m.target = pickToFillTask.id;
        const s = Game.getObjectById(pickToFillTask.id) as AnyStoreStructure;
        m.amount = Math.min((pickToFillTask.max ?? s.store.cap(m.type)) - s.store[m.type], pickToFillTask.remain);
        return;
    }
}

export function runCarrier(creep: Creep, room: RoomInfo) {
    const m = creep.memory as CarrierMemory;
    if (!m.state || m.state == "idle") {
        nextCarrierAction(creep, room);
    }
    switch (m.state) {
        case "refill":
            if (!runRefiller(creep, room)) m.state = "idle";
            break;
        case "fill": {
            const s = Game.getObjectById(m.target) as AnyStoreStructure;
            if (!s) {
                m.state = "idle";
                break;
            }
            if (creep.goTo(s)) {
                if (m.type) {
                    const amount = Math.min(creep.store[m.type], s.store.free(m.type));
                    creep.transfer(s, m.type, amount);
                    let req = _.find(room.moveInReqs, i => i.id == s.id && i.type == m.type);
                    if (req) {
                        req.remain -= amount;
                        if (req.remain <= 0) _.pull(room.moveInReqs, req);
                    }
                    m.type = null;
                    m.state = "idle";
                } else {
                    const type = _.findKey(creep.store) as ResourceConstant;
                    if (!type) { m.state = "idle"; break; }
                    creep.transfer(s, type);
                    if (creep.store[type] == creep.store.tot()) m.state = "idle";
                }
            }
            break;
        }
        case "pick": {
            const s = Game.getObjectById(m.target) as AnyStoreStructure;
            if (!s) {
                m.state = "idle";
                break;
            }
            if (creep.goTo(s)) {
                if (m.type) {
                    const amount = Math.min(creep.store.free(m.type), s.store[m.type]);
                    creep.withdraw(s, m.type, amount);
                    if (amount == s.store[m.type]) {
                        _.remove(room.moveOutReqs, i => i.id == s.id && i.type == m.type && i.max == 0);
                    }
                    m.state = "idle";
                } else {
                    const type = _.findKey(s.store) as ResourceConstant;
                    if (!type) { m.state = "idle"; break; }
                    const amount = Math.min(creep.store.free(type), s.store[type]);
                    creep.withdraw(s, type, amount);
                    if (amount == s.store.tot()) {
                        m.state = "idle"
                        _.remove(room.moveOutReqs, i => i.id == s.id);
                    };
                }
            }
            break;
        }
        case "pickToFill": {
            const s = whereToGet(room, m.type);
            if (!s) {
                m.state = "idle";
                break;
            }
            if (creep.goTo(s)) {
                const amount = Math.min(creep.store.free(m.type), s.store[m.type], m.amount || Infinity);
                creep.withdraw(s, m.type, amount);
                m.state = "fill";
                creep.say("🚚");
            }
            break;
        }
    }
}

