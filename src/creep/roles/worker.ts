import { RoomInfo } from "room/roomInfo";
import { goRefill } from "creep/roles/carrier";
import { goBuild } from "creep/roles/builder";
import { goUpgrade } from "creep/roles/upgrader";

interface WorkerMemory extends CreepMemory {
    status: "pickup" | "refill" | "build"
}

export function runWorker(creep: Creep, room: RoomInfo) {
    if (!creep.goToRoom(room.name)) return;
    let m = creep.memory as WorkerMemory;
    if (!m.status) m.status = "pickup";
    if ((m.status == "build" || m.status == "refill") && creep.store.energy == 0) {
        m.status = "pickup";
    }
    if (m.status == "pickup" && creep.store.free("energy") < 10) {
        if (!_.isEmpty(room.refillTargets)) {
            m.status = "refill";
        } else {
            m.status = "build";
        }
    }
    if (m.status == "pickup") {
        let ruin = room.detail.find(FIND_TOMBSTONES).filter(t => t.store.energy > 0)[0]
            || room.detail.find(FIND_RUINS).filter(r => r.store.energy > 0)[0];
        if (ruin) {
            if (creep.goTo(ruin)) {
                creep.withdraw(ruin, "energy");
            }
            return;
        }
        const sourceId = Number(_.last(m.roleId)) % 2;
        const target = room.structures.sources[sourceId];
        if (creep.goTo(target)) {
            creep.harvest(target);
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
    if (m.status == "pickup" && creep.store.getFreeCapacity("energy") < 10) {
        if (room.structures.controller.ticksToDowngrade < 5000) {
            m.status = "build"
        } else {
            m.status = "refill"
        }
    }
    if (m.status == "pickup") {
        let st = room.detail.find(FIND_TOMBSTONES).filter(t => t.store.energy > 0)[0]
            || room.detail.find(FIND_RUINS).filter(r => r.store.energy > 0)[0]
            || (room.structures.terminal.store.energy > 0) ? room.structures.terminal : room.structures.storage;
        if (st && st.store.energy > 0) {
            if (creep.goTo(st)) {
                creep.withdraw(st, "energy");
            }
            return;
        }
        const target = room.structures.sources[0];
        if (creep.goTo(target)) {
            creep.harvest(target);
        }
        return;
    }
    if (m.status == "build") {
        goUpgrade(creep, room);
    } else {
        goRefill(creep, room);
    }
}
