import { RoomInfo } from "roomInfo";
import { moveCreepTo, moveCreepToRoom } from "moveHelper";
import { goRefill } from "roleCarrier";
import { goBuild } from "roleBuilder";
import { goUpgrade } from "roleUpgrader";

interface WorkerMemory extends CreepMemory {
    status: "pickup" | "refill" | "build"
}

export function runWorker(creep: Creep, room: RoomInfo) {
    if (creep.room.name != room.name) {
        moveCreepToRoom(creep, room.name);
        return;
    }
    let m = creep.memory as WorkerMemory;
    if (!m.status) m.status = "pickup";
    if ((m.status == "build" || m.status == "refill") && creep.store.energy == 0) {
        m.status = "pickup";
    }
    if (m.status == "pickup" && creep.store.getFreeCapacity(RESOURCE_ENERGY) < 10) {
        if (_.keys(room.state.refillState).length > 0) {
            m.status = "refill";
        } else {
            m.status = "build";
        }
    }
    if (m.status == "pickup") {
        let ruin = room.detail.find(FIND_TOMBSTONES).filter(t => t.store.energy > 0)[0]
            || room.detail.find(FIND_RUINS).filter(r => r.store.energy > 0)[0];
        if (ruin) {
            if (creep.pos.isNearTo(ruin)) {
                creep.withdraw(ruin, RESOURCE_ENERGY);
            } else {
                moveCreepTo(creep, ruin);
            }
            return;
        }
        const sourceId = Number(_.last(m.roleId)) % 2;
        const target = room.structures.sources[sourceId];
        if (creep.pos.isNearTo(target)) {
            creep.harvest(target);
        } else {
            moveCreepTo(creep, target);
        }
        return;
    }
    if (m.status == "refill") {
        if (goRefill(creep, room)) return;
    }
    if (room.detail.controller.ticksToDowngrade < 5000) {
        goUpgrade(creep, room); return;
    }
    if (goBuild(creep, room)) return;
    goUpgrade(creep, room);
}

export function runEmergencyWorker(creep: Creep, room: RoomInfo) {
    let m = creep.memory as WorkerMemory;
    if (!m.status) m.status = "pickup";
    if (m.status == "refill" && creep.store.energy == 0) {
        m.status = "pickup";
    }
    if (m.status == "pickup" && creep.store.getFreeCapacity(RESOURCE_ENERGY) < 10) {
        if (room.structures.controller.ticksToDowngrade < 5000) {
            m.status = "build"
        } else {
            m.status = "refill"
        }
    }
    if (m.status == "pickup") {
        let st = room.detail.find(FIND_TOMBSTONES).filter(t => t.store.energy > 0)[0]
            || room.detail.find(FIND_RUINS).filter(r => r.store.energy > 0)[0]
            || room.structures.storage;
        if (st && st.store.energy > 0) {
            if (creep.pos.isNearTo(st)) {
                creep.withdraw(st, RESOURCE_ENERGY);
            } else {
                moveCreepTo(creep, st);
            }
            return;
        }
        const target = room.structures.sources[0];
        if (creep.pos.isNearTo(target)) {
            creep.harvest(target);
        } else {
            moveCreepTo(creep, target);
        }
        return;
    }
    if (m.status == "build") {
        goUpgrade(creep, room);
    } else {
        goRefill(creep, room);
    }
}
