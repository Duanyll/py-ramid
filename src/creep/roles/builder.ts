import { RoomInfo } from "room/roomInfo";
import { moveCreepTo } from "creep/movement";
import { goRefill } from "creep/roles/carrier";
import { goUpgrade } from "creep/roles/upgrader";
import cfg from "config";

interface BuilderMemory extends CreepMemory {
    state: "pickup" | "work",
    lastBuildPos?: { x: number, y: number },
}

export function goBuild(creep: Creep, room: RoomInfo) {
    let m = creep.memory as BuilderMemory;
    if (m.lastBuildPos) {
        let rampart = room.detail.lookForAt(LOOK_STRUCTURES, m.lastBuildPos.x, m.lastBuildPos.y)
            .find(s => s.structureType == "rampart" && s.hits < cfg.WALL_BUILD_STEP) as StructureRampart;
        if (rampart) {
            if (creep.pos.inRangeTo(rampart, 3)) {
                creep.repair(rampart);
            } else {
                moveCreepTo(creep, rampart);
            }
            return true;
        } else {
            delete m.lastBuildPos;
        }
    }
    const target = _.first(room.detail.find(FIND_MY_CONSTRUCTION_SITES));
    if (target) {
        if (creep.pos.inRangeTo(target, 3)) {
            creep.build(target);
            m.lastBuildPos = { x: target.pos.x, y: target.pos.y }
        } else {
            moveCreepTo(creep, target);
            delete m.lastBuildPos;
        }
        return true;
    } else {
        delete m.lastBuildPos;
        if (room.wallBuildQueue.length > 0) {
            const req = room.wallBuildQueue[0];
            let st = Game.getObjectById(req.id) as (StructureRampart | StructureWall);
            if (creep.pos.inRangeTo(st, 3)) {
                if (creep.repair(st) == OK) {
                    req.hitsRemain -= creep.getActiveBodyparts(WORK) * 100;
                    if (req.hitsRemain <= 0) {
                        room.wallBuildQueue.shift();
                        if (room.wallBuildQueue.length == 0 && room.state.energy.usage.builder) {
                            room.delay("fetchWall", 1);
                        }
                    }
                }
            } else {
                moveCreepTo(creep, st);
            }
            return true;
        } else
            return false;
    }
}

export function runBuilder(creep: Creep, room: RoomInfo) {
    let m = creep.memory as BuilderMemory;
    m.state = m.state || "pickup";
    if (m.state == "work" && creep.store.energy == 0) {
        m.state = "pickup";
    }
    if (m.state == "pickup" && creep.store.getFreeCapacity() == 0) {
        m.state = "work";
    }

    if (m.state == "pickup") {
        if (room.state.energy.storeMode) {
            if (room.structRcl >= 7) return;
            const target = _.last(room.detail.find(FIND_SOURCES_ACTIVE));
            if (!target) return;
            if (creep.pos.isNearTo(target)) {
                creep.harvest(target);
            } else {
                moveCreepTo(creep, target);
            }
        } else {
            const target = room.structures.storage
            if (!target) return;
            if (creep.pos.isNearTo(target)) {
                creep.withdraw(target, RESOURCE_ENERGY);
            } else {
                moveCreepTo(creep, target);
            }
        }
    } else {
        if (!room.creepForRole["carry1"]) { if (goRefill(creep, room)) return; }
        if (room.state.energy.storeMode) {
            const target = room.structures.storage;
            if (creep.pos.isNearTo(target)) {
                creep.transfer(target, RESOURCE_ENERGY);
            } else {
                moveCreepTo(creep, target);
            }
            return;
        }
        if (!goBuild(creep, room)) goUpgrade(creep, room);
    }
}
