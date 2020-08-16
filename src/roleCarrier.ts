import { RoomInfo, MoveRequest, runCallback } from "roomInfo";
import { moveCreepTo } from "moveHelper";

interface CarrierMemory extends CreepMemory {
    status: "ready" | "picking" | "moving",
    // 分配时保证在 creep 容量范围内
    task?: MoveRequest,
    busyTime: number
}

function runCarrier(creep: Creep, room: RoomInfo) {
    let memory = creep.memory as CarrierMemory;
    if (memory.status != "ready") {
        memory.busyTime++;
        const task = memory.task as MoveRequest;
        if (memory.status = "picking") {
            if (creep.pos.isNearTo(task.from)) {
                creep.withdraw(task.from, task.type, task.amount);
                memory.status = "moving";
            } else {
                moveCreepTo(creep, task.from);
            }
        } else {
            if (creep.pos.isNearTo(task.to)) {
                creep.transfer(task.to, task.type, task.amount);
                if (task.callback) runCallback(task.callback, room);
                memory.status = "ready";
                memory.task = undefined;
            } else {
                moveCreepTo(creep, task.to);
            }
        }
    }
}

function getCarrierBodySize(room: RoomInfo) {
    const energy = room.detail.energyCapacityAvailable;
    return Math.max(Math.floor(energy / 100 * 0.7), 20);
}

function getCarrierBodyPart(room: RoomInfo): BodyPartConstant[] {
    const size = getCarrierBodySize(room);
    let res: BodyPartConstant[] = [];
    for (let i = 0; i < size; i++) {
        res.push(MOVE);
    }
    for (let i = 0; i < size; i++) {
        res.push(CARRY);
    }
    return res;

}

export function tickCarrier(room: RoomInfo): void {

}
