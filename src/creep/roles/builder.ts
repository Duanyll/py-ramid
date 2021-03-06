import { RoomInfo } from "room/roomInfo";
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

    // 优先把才修好的 rampart 修一点防止损坏
    if (m.lastBuildPos) {
        let rampart = room.detail.lookForAt(LOOK_STRUCTURES, m.lastBuildPos.x, m.lastBuildPos.y)
            .find(s => s.structureType == "rampart" && s.hits < cfg.WALL_BUILD_STEP) as StructureRampart;
        if (rampart) {
            if (creep.goTo(rampart, 3)) {
                creep.repair(rampart);
            }
            return true;
        } else {
            delete m.lastBuildPos;
        }
    }

    // 随便找一个工地, 以后可能实现建造优先级
    const target = _.first(room.detail.find(FIND_MY_CONSTRUCTION_SITES));
    if (target) {
        if (creep.goTo(target, 3)) {
            creep.build(target);
            m.lastBuildPos = { x: target.pos.x, y: target.pos.y }
        } else {
            delete m.lastBuildPos;
        }
        return true;
    }

    delete m.lastBuildPos;
    if (room.wallBuildRequest.size > 0) {
        if (!m.target || !room.wallBuildRequest.has(m.target)) {
            m.target = getCloestWall(creep, room.wallBuildRequest);
        }

        let st = Game.getObjectById(m.target) as (StructureRampart | StructureWall);
        let remHits = room.wallBuildRequest.get(m.target);
        if (creep.goTo(st, 3)) {
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
        }
        return true;
    } else
        return false;

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
            if (creep.goTo(target)) {
                creep.harvest(target);
            }
        } else {
            const target = room.structures.storage
            if (!target) return;
            if (creep.goTo(target)) {
                creep.withdraw(target, "energy");
            }
        }
    } else {
        if (_.isEmpty(room.creepForRole["carry1"])) { if (goRefill(creep, room)) return; }
        if (room.state.energy.storeMode) {
            const target = room.structures.storage;
            if (creep.goTo(target)) {
                creep.transfer(target, "energy");
            }
            return;
        }
        if (!goBuild(creep, room)) goUpgrade(creep, room);
    }
}
