import { creepGroups } from "creep/creepInfo";
import { onPBHarvesterArrive } from "industry/highwayMining";
import { lockCreepPosition, moveCreepTo, moveCreepToRoom } from "creep/movement";
import { myRooms } from "room/roomInfo";
import { objToPos } from "utils";

interface PowerHarvesterMemory extends CreepMemory {
    arrived: boolean;
    started: boolean;
}

export function runPowerHarvester(creep: Creep) {
    let m = creep.memory as PowerHarvesterMemory;
    let pbInfo = Memory.mining.power.info[m.target];
    const tarpos = objToPos(pbInfo.pos);
    if (creep.room.name != tarpos.roomName) {
        moveCreepToRoom(creep, tarpos.roomName);
    } else if (!creep.pos.isNearTo(tarpos)) {
        moveCreepTo(creep, tarpos);
    } else {
        if (!m.arrived) {
            m.arrived = true;
            pbInfo.distance = CREEP_LIFE_TIME - creep.ticksToLive;
        }
        const group = creepGroups[m.group];
        if (group["heal1"]?.pos.isNearTo(creep.pos) && group["heal2"]?.pos.isNearTo(creep.pos)) {
            const pb = tarpos.lookFor(LOOK_STRUCTURES).find(s => s.structureType == STRUCTURE_POWER_BANK) as StructurePowerBank;
            if (!pb) {
                pbInfo.status = "harvested";
                delete Memory.mining.power.roomLock[pbInfo.harvRoom];
                creep.suicide();
                return;
            } else {
                if (!m.started) {
                    m.started = true;
                    onPBHarvesterArrive(creep, pbInfo, m.target);
                }
                if (pb.hits < 5000 && creep.ticksToLive > 10) {
                    const carryGroup = creepGroups[pbInfo.carryGroup];
                    const carrierCount = _.ceil(pb.power / (CARRY_CAPACITY * 25));
                    const readyCount = _.values(carryGroup).filter(c => c.pos.inRangeTo(tarpos, 8)).length;
                    if (readyCount < carrierCount) return;
                }
                creep.attack(pb);
                lockCreepPosition(creep);
            }
        }
    }
}

export function runPowerHealer(creep: Creep) {
    let m = creep.memory;
    let pbInfo = Memory.mining.power.info[m.target];
    const tarpos = objToPos(pbInfo.pos);
    if (creep.room.name != tarpos.roomName) {
        moveCreepToRoom(creep, tarpos.roomName);
    } else if (!creep.pos.inRangeTo(tarpos, 5)) {
        moveCreepTo(creep, tarpos);
    } else {
        let healTarget = creepGroups[m.group]["attack"];
        if (!healTarget && pbInfo.status == "harvested") {
            creep.suicide();
            return;
        }
        if (!healTarget) return;
        lockCreepPosition(creep);
        if (healTarget.pos.isNearTo(tarpos)) {
            if (creep.pos.isNearTo(healTarget)) {
                creep.heal(healTarget);
            } else {
                moveCreepTo(creep, healTarget);
            }
        }
    }
}

interface PBCarrierMemory extends CreepMemory {
    state: "go" | "back",
}
export function runPowerCarrier(creep: Creep) {
    let m = creep.memory as PBCarrierMemory;
    let pbInfo = Memory.mining.power.info[m.target];
    const tarpos = objToPos(pbInfo.pos);
    if (m.state == "go") {
        if (creep.room.name != tarpos.roomName) {
            moveCreepToRoom(creep, tarpos.roomName);
        } else if (!creep.pos.inRangeTo(tarpos, 4)) {
            moveCreepTo(creep, tarpos, 4);
        } else if (pbInfo.status == "harvested") {
            if (!creep.pos.isNearTo(tarpos)) {
                moveCreepTo(creep, tarpos);
            } else {
                const ruin = tarpos.lookFor(LOOK_RUINS)[0];
                if (ruin) {
                    creep.withdraw(ruin, RESOURCE_POWER);
                    m.state = "back";
                } else {
                    const resource = tarpos.lookFor(LOOK_RESOURCES).find(r => r.resourceType == RESOURCE_POWER);
                    if (resource) creep.pickup(resource);
                    m.state = "back";
                }
            }
        } else {
            lockCreepPosition(creep);
        }
    } else {
        const home = pbInfo.harvRoom
        if (creep.room.name != home) {
            moveCreepToRoom(creep, home);
        } else {
            let room = myRooms[home];
            let storage = room.structures.storage;
            if (!creep.pos.isNearTo(storage)) {
                moveCreepTo(creep, storage);
            } else {
                creep.transfer(storage, RESOURCE_POWER);
                room.logStore(RESOURCE_POWER, creep.store.getUsedCapacity(RESOURCE_POWER));
                creep.suicide();
            }
        }
    }
}
