import { RoomInfo, registerCallback } from "roomInfo";
import { moveCreepTo } from "moveHelper";
import { goRefill } from "roleCarrier";
import { goUpgrade } from "roleUpgrader";

export function onSRCLUpgrade(room: RoomInfo) {
    if (room.structRcl >= 5) room.delay("runLinks", 1);
    if (room.structRcl >= 6) global.mining(room.name, true);
}

export function setConstruction(room: RoomInfo, full?: boolean) {
    if (global.remainConstructionCount <= 0) {
        room.delay("setConstruction", 1000);
        return;
    }
    const stage = room.design.currentStage;
    if (full) {
        for (let i = 1; i < stage; i++) {
            const list = room.design.stages[i].list;
            list.forEach(s => {
                if (global.remainConstructionCount < 0) return;
                if (!(_.find(room.detail.lookForAt(LOOK_STRUCTURES, s.x, s.y), st => st.structureType == s.type)
                    || _.find(room.detail.lookForAt(LOOK_CONSTRUCTION_SITES, s.x, s.y), c => c.structureType == s.type))) {
                    // @ts-expect-error 2345
                    room.detail.createConstructionSite(s.x, s.y, s.type, s.name);
                    global.remainConstructionCount--;
                }
            })
            if (global.remainConstructionCount <= 0) return;
        }
    }
    let nextStage = true;
    if (!room.design.stages[stage]) return;
    if (room.design.stages[stage].rcl > room.structures.controller.level) return;
    room.design.stages[stage].list.forEach(s => {
        if (global.remainConstructionCount < 0) return;
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
                global.remainConstructionCount--;
            }
        }
    });
    if (nextStage) {
        console.log(`Room ${room.name}: Construction stage ${room.design.currentStage} compelete.`);
        room.design.currentStage++;
        onSRCLUpgrade(room);
        setConstruction(room);
    } else {
        room.delay("setConstruction", 1000);
    }
}
registerCallback("setConstruction", setConstruction);
registerCallback("fullCheckConstruction", (room) => {
    setConstruction(room, true);
    room.delay("fullCheckConstruction", 5000);
})

interface BuilderMemory extends CreepMemory {
    state: "pickup" | "work",
    lastBuildPos?: { x: number, y: number }
}

export function goBuild(creep: Creep, room: RoomInfo) {
    let m = creep.memory as BuilderMemory;
    if (m.lastBuildPos) {
        let rampart = room.detail.lookForAt(LOOK_STRUCTURES, m.lastBuildPos.x, m.lastBuildPos.y)
            .find(s => s.structureType == "rampart" && s.hits < 20000) as StructureRampart;
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
        if (room.rampartToRepair) {
            const ram = room.rampartToRepair;
            if (creep.pos.inRangeTo(ram, 3)) {
                creep.repair(ram);
            } else {
                moveCreepTo(creep, ram);
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
        if (room.state.energyState == "store") {
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
