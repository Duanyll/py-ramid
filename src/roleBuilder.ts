import { RoomInfo, registerCallback } from "roomInfo";
import { ROOM_LEAST_STORE_ENERGY, ROOM_STORE_ENERGY } from "config";
import { moveCreepTo } from "moveHelper";
import { goRefill } from "roleCarrier";
import { goUpgrade } from "roleUpgrader";

export function setConstruction(room: RoomInfo, full?: boolean) {
    let avalSites = MAX_CONSTRUCTION_SITES - _.size(Game.constructionSites);
    if (avalSites <= 0) {
        room.delay("setConstruction", 500);
        return;
    }
    const stage = room.design.currentStage;
    if (full) {
        for (let i = 1; i < stage; i++) {
            const list = room.design.stages[i].list;
            list.forEach(s => {
                if (avalSites < 0) return;
                if (!(_.find(room.detail.lookForAt(LOOK_STRUCTURES, s.x, s.y), st => st.structureType == s.type)
                    || _.find(room.detail.lookForAt(LOOK_CONSTRUCTION_SITES, s.x, s.y), c => c.structureType == s.type))) {
                    // @ts-expect-error 2345
                    room.detail.createConstructionSite(s.x, s.y, s.type, s.name);
                    avalSites--;
                }
            })
            if (avalSites <= 0) return;
        }
    }
    let nextStage = true;
    if (!room.design.stages[stage]) return;
    if (room.design.stages[stage].rcl > room.structures.controller.level) return;
    room.design.stages[stage].list.forEach(s => {
        if (avalSites < 0) return;
        if (!_.find(room.detail.lookForAt(LOOK_STRUCTURES, s.x, s.y), st => st.structureType == s.type)) {
            nextStage = false;
            if (!_.find(room.detail.lookForAt(LOOK_CONSTRUCTION_SITES, s.x, s.y), c => c.structureType == s.type)) {
                if (s.type != STRUCTURE_WALL) {
                    let wall = _.find(room.detail.lookForAt(LOOK_STRUCTURES, s.x, s.y),
                        st => st.structureType == STRUCTURE_WALL) as StructureWall;
                    if (wall) wall.destroy();
                }
                // @ts-expect-error 2345
                room.detail.createConstructionSite(s.x, s.y, s.type, s.name);
                avalSites--;
            }
        }
    });
    if (nextStage) {
        console.log(`Room ${room.name}: Construction stage ${room.design.currentStage} compelete.`)
        room.updateCreepCount();
        room.design.currentStage++;
        setConstruction(room);
    } else {
        room.delay("setConstruction", 500);
    }
}
registerCallback("setConstruction", setConstruction);

interface BuilderMemory extends CreepMemory {
    state: "pickup" | "work",
    lastBuildPos?: { x: number, y: number }
}

export function goBuild(creep: Creep, room: RoomInfo) {
    let m = creep.memory as BuilderMemory;
    if (m.lastBuildPos) {
        let rampart = room.detail.lookForAt(LOOK_STRUCTURES, m.lastBuildPos.x, m.lastBuildPos.y)
            .find(s => s.structureType == "rampart" && s.hits < 100) as StructureRampart;
        if (rampart) {
            creep.repair(rampart);
            return true;
        }
    }
    const target = _.first(room.detail.find(FIND_MY_CONSTRUCTION_SITES));
    if (target) {
        if (creep.pos.inRangeTo(target, 3)) {
            creep.build(target);
            m.lastBuildPos = { x: target.pos.x, y: target.pos.y }
        } else {
            moveCreepTo(creep, target);
            m.lastBuildPos = undefined;
        }
        return true;
    } else {
        return false;
    }
}

function runBuilder(creep: Creep, room: RoomInfo) {
    let m = creep.memory as BuilderMemory;
    m.state = m.state || "pickup";
    if (m.state == "work" && creep.store.energy == 0) {
        m.state = "pickup";
    }
    if (m.state == "pickup" && creep.store.getFreeCapacity() == 0) {
        m.state = "work";
    }

    if (m.state == "pickup") {
        if (room.state.energyState == "store") {
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
        if (!room.creeps["carry"]) { if (goRefill(creep, room)) return; }
        if (room.state.energyState == "store") {
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

export function tickBuilder(room: RoomInfo): void {
    if (!room.creeps["build"]) return;
    room.creeps["build"].forEach((creep) => {
        runBuilder(creep, room);
    })
}

