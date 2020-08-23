import { RoomInfo, runCallback } from "roomInfo";
import { moveCreepTo } from "moveHelper";

interface CarrierMemory extends CreepMemory {
    // 分配时保证在 creep 容量范围内
    from: [string, number][];
    to: [string, number, RoomCallback?][];
    type: ResourceConstant;
}

function selectRefillTarget(creep: Creep, room: RoomInfo) {
    let target = "";
    let dis = Infinity;
    for (const id in room.state.refillState) {
        if (room.state.refillState[id] == 0) {
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
    let target = creep.memory.target;
    if (!room.state.refillState[target]) {
        target = creep.memory.target = selectRefillTarget(creep, room);
        if (target == "") return false;
    }
    let s = Game.getObjectById(target) as RefillableStructure;
    if (creep.pos.isNearTo(s)) {
        creep.transfer(s, RESOURCE_ENERGY);
        if (s.store.getFreeCapacity(RESOURCE_ENERGY) == 0) {
            delete room.state.refillState[s.id];
        } else {
            room.state.refillState[s.id] = s.store.getFreeCapacity(RESOURCE_ENERGY);
        }
    } else {
        moveCreepTo(creep, s);
    }
    return true;
}

function runRefiller(creep: Creep, room: RoomInfo) {
    if (creep.store.energy == 0) {
        if (creep.pos.isNearTo(room.structures.storage)) {
            creep.withdraw(room.structures.storage, RESOURCE_ENERGY);
        } else {
            moveCreepTo(creep, room.structures.storage);
        }
    } else {
        goRefill(creep, room);
    }
}

function runCarrier(creep: Creep, room: RoomInfo) {
    let m = creep.memory as CarrierMemory;
    if (!m.from) m.from = [];
    if (!m.to) m.to = [];
    if (m.from.length == 0 && m.to.length == 0) {
        if (room.moveQueue.length) {
            if (creep.store.getUsedCapacity() > 0) {
                m.to[0] = [room.structures.storage.id, creep.store.energy];
            }
            let request = room.moveQueue.shift() as MoveRequest;
            const amount = Math.min(creep.store.getFreeCapacity(), request.amount);
            m.from[0] = [request.from, request.amount];
            m.type = request.type;
            if (amount < request.amount) {
                request.amount -= amount;
                room.moveQueue.push(request);
                m.to[0] = [request.to, request.amount];
            } else {
                m.to[0] = [request.to, request.amount, request.callback];
            }
        } else {
            runRefiller(creep, room);
        }
    }
    if (m.from.length) {
        const target = Game.getObjectById(m.from[0][0]) as AnyStoreStructure;
        if (!target) {
            console.log(`Creep ${creep.name} warning: invalid target ${m.from[0][0]}`);
            m.from.shift();
            return;
        }
        if (creep.pos.isNearTo(target)) {
            creep.withdraw(target, m.type, m.from[0][1]);
            m.from.shift();
        } else {
            moveCreepTo(creep, target);
        }
    } else if (m.to.length) {
        const target = Game.getObjectById(m.to[0][0]) as AnyStoreStructure;
        if (!target) {
            console.log(`Creep ${creep.name} warning: invalid target ${m.to[0][0]}`);
            m.to.shift();
            return;
        }
        if (creep.pos.isNearTo(target)) {
            creep.transfer(target, m.type, m.to[0][1]);
            if (m.to[0][2]) runCallback(m.to[0][2], room);
            m.to.shift();
        } else {
            moveCreepTo(creep, target);
        }
    }
}

export function tickCarrier(room: RoomInfo): void {
    if (!room.creeps["carry"]) return;
    room.creeps["carry"].forEach((creep) => {
        runCarrier(creep, room);
    })
}
