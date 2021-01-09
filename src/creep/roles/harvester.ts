import { registerRoomRoutine, RoomInfo } from "room/roomInfo";
import { moveCreepTo, moveCreepToRoom } from "creep/movement";
import { goRefill } from "creep/roles/carrier";
import { objToPos } from "utils";
import cfg from "config";
import { roleBodies } from "creep/body";

interface HarvesterMemory extends CreepMemory {
    status: "harvest" | "move"
}

export function runHarvester(creep: Creep, room: RoomInfo) {
    let m = creep.memory as HarvesterMemory;
    m.status = m.status || "harvest";
    if (m.status == "move" && creep.store.energy == 0) {
        m.status = "harvest";
    }
    if (m.status == "harvest" && creep.store.getFreeCapacity() < creep.getActiveBodyparts(WORK) * 2){
        m.status = "move";
    }

    const sourceId = Number(_.last(m.roleId)) - 1;
    if (m.status == "harvest") {
        const target = room.structures.sources[sourceId];
        if (creep.pos.isNearTo(target)) {
            creep.harvest(target);
        } else {
            moveCreepTo(creep, target);
        }
    } else {
        if (_.isEmpty(room.creepForRole["carry1"])) { if (goRefill(creep, room)) return; }
        let target = room.structures.sourceLink[sourceId] || room.structures.storage;
        // 6 级房没有 centerLink, 不能传送, 必须直接送达
        if (room.structRcl < 5 || (room.structRcl <= 6 && sourceId == 1)) target = room.structures.storage;
        if (creep.pos.isNearTo(target)) {
            creep.transfer(target, RESOURCE_ENERGY);
            if (target instanceof StructureLink) room.delay("runLinks", 1);
        } else {
            moveCreepTo(creep, target);
        }
    }
}

interface RemoteHarvesterMemory extends CreepMemory {
    status: "harvest" | "move";
    source: { id: string, room: string }
}

interface RemoteCarrierMemory extends CreepMemory {
    status: "carry" | "pickup"
}

export function runRemoteCarrier(creep: Creep, room: RoomInfo) {
    let m = creep.memory as RemoteCarrierMemory;
    m.status = m.status || "pickup";
    if (m.status == "carry" && creep.store.energy == 0) {
        m.status = "pickup";
    }
    if (m.status == "pickup" && creep.store.getFreeCapacity() == 0) {
        m.status = "carry";
    }

    if (m.status == "pickup") {
        let tarpos = objToPos(room.design.remoteSources.containers[Number(creep.memory.target)]);
        if (!tarpos) return;
        if (tarpos.roomName != creep.room.name) {
            moveCreepToRoom(creep, tarpos.roomName);
        } else {
            let container = tarpos.lookFor(LOOK_STRUCTURES)
                .filter(s => s.structureType == STRUCTURE_CONTAINER)[0] as StructureContainer;
            if (container.store.energy >= creep.store.getCapacity()) {
                if (creep.pos.isNearTo(container)) {
                    creep.withdraw(container, RESOURCE_ENERGY);
                } else {
                    moveCreepTo(creep, container);
                }
            }
        }
    } else {
        let target = room.structures.storage;
        if (creep.pos.isNearTo(target)) {
            creep.transfer(target, RESOURCE_ENERGY);
        } else {
            moveCreepTo(creep, target);
            let road = creep.pos.lookFor(LOOK_STRUCTURES)
                .filter(s => s.structureType == STRUCTURE_ROAD)[0] as StructureRoad;
            if (road && road.hitsMax - road.hits >= 100) creep.repair(road);
        }
    }
}

export function runRemoteHarvester(creep: Creep, room: RoomInfo) {
    let m = creep.memory as RemoteHarvesterMemory;
    m.status = m.status || "harvest";
    if (m.status == "move" && creep.store.energy == 0) {
        m.status = "harvest";
    }
    if (m.status == "harvest" && creep.store.getFreeCapacity() == 0) {
        m.status = "move";
    }

    if (m.status == "harvest") {
        let tarpos = objToPos(room.design.remoteSources.sources[Number(creep.memory.target)]);
        if (!tarpos) return;
        if (tarpos.roomName != creep.room.name) {
            moveCreepToRoom(creep, tarpos.roomName);
        } else {
            let source = tarpos.lookFor(LOOK_SOURCES)[0];
            if (source) {
                if (creep.pos.isNearTo(source)) {
                    creep.harvest(source);
                } else {
                    moveCreepTo(creep, source);
                }
            }
        }
    } else {
        let tarpos = objToPos(room.design.remoteSources.containers[Number(creep.memory.target)]);
        if (!tarpos) return;
        if (tarpos.roomName != creep.room.name) {
            moveCreepToRoom(creep, tarpos.roomName);
        } else {
            let container = tarpos.lookFor(LOOK_STRUCTURES)
                .filter(s => s.structureType == STRUCTURE_CONTAINER)[0] as StructureContainer;
            if (container) {
                if (creep.pos.isNearTo(container)) {
                    if (container.hitsMax - container.hits >= 5000) creep.repair(container);
                    creep.transfer(container, RESOURCE_ENERGY);
                } else {
                    moveCreepTo(creep, container);
                }
            } else {
                let site = tarpos.lookFor(LOOK_CONSTRUCTION_SITES)[0];
                if (site) {
                    if (creep.pos.inRangeTo(site, 3)) {
                        creep.build(site);
                    } else {
                        moveCreepTo(creep, site);
                    }
                }
            }
        }
    }
}

export function runRemoteReserver(creep: Creep) {
    if (creep.room.name != creep.memory.target) {
        moveCreepToRoom(creep, creep.memory.target);
    } else {
        let controller = creep.room.controller;
        if (!controller.reservation || controller.reservation.username == cfg.USER_NAME && controller.reservation.ticksToEnd <= 4500) {
            if (creep.pos.isNearTo(controller)) {
                creep.reserveController(controller);
            } else {
                moveCreepTo(creep, controller);
            }
        }
    }
}

interface RemoteBuilderMemory extends CreepMemory {
    status: "pickup" | "work"
}
export function runRemoteBuilder(creep: Creep) {
    if (creep.room.name != creep.memory.target) {
        moveCreepToRoom(creep, creep.memory.target);
    } else {
        let m = creep.memory as RemoteBuilderMemory;
        m.status = m.status || "pickup";
        if (m.status == "work" && creep.store.energy == 0) {
            m.status = "pickup";
        }
        if (m.status == "pickup" && creep.store.getFreeCapacity() == 0) {
            m.status = "work";
        }

        if (m.status == "pickup") {
            let source = creep.room.find(FIND_SOURCES_ACTIVE)[0];
            if (source) {
                if (creep.pos.isNearTo(source)) {
                    creep.harvest(source);
                } else {
                    moveCreepTo(creep, source);
                }
            }
        } else {
            let site = creep.room.find(FIND_MY_CONSTRUCTION_SITES)[0];
            if (site) {
                if (creep.pos.inRangeTo(site, 3)) {
                    creep.build(site);
                } else {
                    moveCreepTo(creep, site);
                }
            }
        }
    }
}

function tickRemoteHarvest(room: RoomInfo) {
    let rhInfo = room.detail.memory.remoteHarvest;
    if (rhInfo && room.structRcl >= 7) {
        _.forIn(rhInfo, (info, roomName) => {
            if (info.status == "disabled") return;
            if (Game.rooms[roomName] && Game.rooms[roomName].find(FIND_HOSTILE_CREEPS).length > 0) {
                room.creepRoleDefs[`rhGuard-${roomName}`] = {
                    role: "rhGuard",
                    body: roleBodies["rhGuard"],
                    target: roomName
                };
            }
            switch (info.status) {
                case "waiting":
                    // if (global.remainConstructionCount > 0) {
                    //     info.status = "building";
                    // }
                    break;
                case "building":
                    room.creepRoleDefs[`rhBuild-${roomName}`] = {
                        role: "rhBuild",
                        body: roleBodies["rhBuild"],
                        target: roomName
                    };
                    break;
                case "working":
                    _.keys(info.sources).forEach((i) => {
                        room.creepRoleDefs[`rhHarv-${roomName}-${i}`] = {
                            role: "rhHarv",
                            body: roleBodies["rhHarv"],
                            target: i
                        };
                        room.creepRoleDefs[`rhBuild-${roomName}-${i}`] = {
                            role: "rhCarry",
                            body: roleBodies["rhCarry"],
                            target: i
                        };
                    })
                    let reservation = Game.rooms[roomName]?.controller.reservation;
                    if (!reservation || reservation.username == cfg.USER_NAME && reservation.ticksToEnd < 1000) {
                        room.creepRoleDefs[`rhReserve-${roomName}`] = {
                            role: "rhReserve",
                            body: roleBodies["rhReserve"],
                            target: roomName
                        };
                    }
            }
        })
    }
}

// function checkRHConstruction(room: RoomInfo) {

// }
// registerCallback("checkRHConstruction", checkRHConstruction);
