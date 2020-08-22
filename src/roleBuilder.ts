import { RoomInfo, registerCallback } from "roomInfo";
import { ROOM_STORE_ENERGY } from "config";
import { moveCreepTo } from "moveHelper";
import { goRefill } from "roleCarrier";

function setConstruction(room: RoomInfo, full?: boolean) {
    let avalSites = MAX_CONSTRUCTION_SITES - _.size(Game.constructionSites);
    if (avalSites <= 0) {
        room.scheduleEvent(Game.time + 500, { type: "setConstruction" });
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
                    room.detail.createConstructionSite(s.x, s.y, s.type);
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
                room.detail.createConstructionSite(s.x, s.y, s.type);
                avalSites--;
            }
        }
    });
    if (nextStage) {
        room.design.currentStage++;
        setConstruction(room);
    }
}
registerCallback("setConstruction", setConstruction);

interface BuilderMemory extends CreepMemory {
    state: "pickup"| "work"
}

function goBuild(creep: Creep, room: RoomInfo) {
    const target = _.first(room.detail.find(FIND_MY_CONSTRUCTION_SITES));
    if (!target) return false;
    if (creep.pos.inRangeTo(target, 3)) {
        creep.build(target);
    } else {
        moveCreepTo(creep, target);
    }
    return true;
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
        if (room.structures.storage.store.energy <= ROOM_STORE_ENERGY) {
            const target = _.first(creep.room.find(FIND_SOURCES_ACTIVE));
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
        if (!goBuild(creep, room)) {
            goRefill(creep, room);
        }
    }
}

export function tickBuilder(room: RoomInfo): void {
    if (!room.structures.storage) return;
    room.creeps["build"].forEach((creep) => {
        runBuilder(creep, room);
    })
}

