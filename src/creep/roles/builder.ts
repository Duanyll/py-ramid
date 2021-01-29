import { RoomInfo } from "room/roomInfo";
import { moveCreepTo } from "creep/movement";
import { goRefill } from "creep/roles/carrier";
import { goUpgrade } from "creep/roles/upgrader";
import cfg from "config";

function getCloestWall(creep: Creep, walls: Map<string, number>) {
    let mindis = Infinity;
    let result = '';
    for (const id of walls.keys()) {
        const dis = creep.pos.getRangeTo(Game.getObjectById(id));
        if (dis < mindis) {
            mindis = dis;
            result = id;
        }
    }
    return result;
}

interface BuilderMemory extends CreepMemory {
    state: "pickup" | "work",
    lastBuildPos?: { x: number, y: number },
    target: string
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
        if (room.wallBuildRequest.size > 0) {
            if (!m.target || !room.wallBuildRequest.has(m.target)) {
                m.target = getCloestWall(creep, room.wallBuildRequest);
            }

            let st = Game.getObjectById(m.target) as (StructureRampart | StructureWall);
            let remHits = room.wallBuildRequest.get(m.target);
            if (creep.pos.inRangeTo(st, 3)) {
                if (creep.repair(st) == OK) {
                    remHits -= creep.getActiveBodyparts(WORK) * 100;
                    if (remHits <= 0) {
                        room.wallBuildRequest.delete(m.target);
                        if (room.wallBuildRequest.size == 0 && room.state.energy.usage.builder) {
                            room.delay("fetchWall", 1);
                        }
                    } else {
                        room.wallBuildRequest.set(m.target, remHits);
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
