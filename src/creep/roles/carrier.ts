import { RoomInfo } from "room/roomInfo";
import { moveCreepTo } from "creep/movement";
import { whereToGet, whereToPut } from "./manager";
import { LAB_RECIPE } from "utils/constants";

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
    state: "pick" | "fill" | "refill" | "pickToFill" | "idle" | "return",
    /** pick 时可选, fill 可选, pickToFill 必选 */
    type?: ResourceConstant,
    amount?: number
}

function getPickTask(room: RoomInfo): { id: string, type?: ResourceConstant } {
    const labInfo = room.state.lab;
    for (let i = 0; i < room.structures.labs.input.length; i++) {
        const lab = room.structures.labs.input[i];
        if (labInfo.remain <= 0) {
            if (lab.mineralType)
                return { id: lab.id, type: lab.mineralType };
        } else {
            let recipe = LAB_RECIPE[labInfo.product][i];
            if (lab.mineralType && lab.mineralType != recipe) {
                return { id: lab.id, type: lab.mineralType };
            }
        }
    }

    for (let i = 0; i < room.structures.labs.output.length; i++) {
        const lab = room.structures.labs.output[i];
        if (i < labInfo.boost.length) {
            let res = labInfo.boost[i].type;
            if (lab.mineralType && lab.mineralType != res) {
                return { id: lab.id, type: lab.mineralType };
            }
        } else {
            if (labInfo.remain <= 0) {
                if (lab.mineralType)
                    return { id: lab.id, type: lab.mineralType };
            } else {
                if (lab.mineralType && lab.mineralType != labInfo.product) {
                    return { id: lab.id, type: lab.mineralType };
                } else if (lab.store[lab.mineralType] >= 800) {
                    return { id: lab.id, type: lab.mineralType };
                }
            }
        }
    }

    if (room.structures.mineralContainer?.store.tot() > 1000) {
        return { id: room.structures.mineralContainer.id };
    }

    return null;
}

function getFillTask(room: RoomInfo): { id: string, type: ResourceConstant, amount: number } {
    function hasRes(res: ResourceConstant) {
        return (room.structures.storage?.store[res] || 0) + (room.structures.terminal?.store[res] || 0) > 0;
    }
    const labInfo = room.state.lab;
    for (let i = 0; i < room.structures.labs.input.length; i++) {
        const lab = room.structures.labs.input[i];
        if (labInfo.remain > 0) {
            let recipe = LAB_RECIPE[labInfo.product][i];
            if (!lab.mineralType || lab.mineralType == recipe) {
                const amount = labInfo.remain - lab.store[recipe];
                if ((amount > 1000 || labInfo.remain < 1000 && amount > 0) && hasRes(recipe))
                    return { id: lab.id, type: recipe, amount };
            }
        }
    }

    for (let i = 0; i < room.structures.labs.output.length; i++) {
        const lab = room.structures.labs.output[i];
        if (i < labInfo.boost.length) {
            let res = labInfo.boost[i].type;
            if (!lab.mineralType || lab.mineralType == res) {
                const amount = labInfo.boost[i].amount - lab.store[res];
                if (amount > 0 && hasRes(res))
                    return { id: lab.id, type: res, amount };
            }
        } else break;
    }

    return null;
}

function nextCarrierAction(creep: Creep, room: RoomInfo) {
    const m = creep.memory as CarrierMemory;

    // 装满了
    if (creep.store.free() <= 100) {
        m.type = null;
        m.state = "return";
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

    // 尝试获取新的取货任务
    const pickTask = getPickTask(room);
    if (pickTask) {
        m.state = "pick";
        m.target = pickTask.id;
        m.type = pickTask.type;
        creep.say("🚚")
        return;
    } else if (creep.store.tot()) {
        m.type = null;
        m.state = "return";
        creep.say("🔙");
    }

    // 执行装填任务
    const pickToFillTask = getFillTask(room);
    if (pickToFillTask) {
        m.state = "pickToFill";
        creep.say("🧱");
        m.type = pickToFillTask.type;
        m.target = pickToFillTask.id;
        const s = Game.getObjectById(pickToFillTask.id) as AnyStoreStructure;
        m.amount = pickToFillTask.amount;
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
            if (!runRefiller(creep, room)) m.state = "return";
            break;
        case "return": {
            if (!m.type || !creep.store[m.type])
                m.type = _.findKey(creep.store) as ResourceConstant;
            if (!m.type) {
                m.state = "idle";
                break;
            }
            const s = whereToPut(room, m.type);
            if (creep.goTo(s)) {
                const amount = Math.min(creep.store[m.type], s.store.free(m.type));
                creep.transfer(s, m.type, amount);
                if (amount == creep.store.tot()) {
                    m.state = "idle";
                } else if (amount == creep.store[m.type]) {
                    m.type = null;
                }
            }
            break;
        }
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
                    m.state = "idle";
                } else {
                    const type = _.findKey(s.store) as ResourceConstant;
                    if (!type) { m.state = "idle"; break; }
                    const amount = Math.min(creep.store.free(type), s.store[type]);
                    creep.withdraw(s, type, amount);
                    if (amount == s.store.tot()) m.state = "idle";
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

