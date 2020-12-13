import { creepGroups, registerCreepRole } from "creep";
import { lockCreepPosition, moveCreepTo, moveCreepToRoom } from "moveHelper";
import { myRooms } from "roomInfo";
import { objToPos } from "utils/utils";

function runPowerHarvester(creep: Creep) {
    let m = creep.memory;
    let pbInfo = Memory.mining.power.info[m.target];
    const tarpos = objToPos(pbInfo.pos);
    if (creep.room.name != tarpos.roomName) {
        moveCreepToRoom(creep, tarpos.roomName);
    } else if (!creep.pos.isNearTo(tarpos)) {
        moveCreepTo(creep, tarpos);
    } else {
        const group = creepGroups[m.group];
        if (group["heal1"]?.pos.isNearTo(creep.pos) && group["heal2"]?.pos.isNearTo(creep.pos)) {
            const pb = tarpos.lookFor(LOOK_STRUCTURES).find(s => s.structureType == STRUCTURE_POWER_BANK) as StructurePowerBank;
            if (!pb) {
                pbInfo.status = "harvested";
                delete Memory.mining.power.from[pbInfo.harvRoom];
                creep.suicide();
                return;
            } else {
                if (pb.hits < 5000) {
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

function runPowerHealer(creep: Creep) {
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
    status: "go" | "back",
}
function runPowerCarrier(creep: Creep) {
    let m = creep.memory as PBCarrierMemory;
    let pbInfo = Memory.mining.power.info[m.target];
    const tarpos = objToPos(pbInfo.pos);
    if (m.status == "go") {
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
                    m.status = "back";
                } else {
                    const resource = tarpos.lookFor(LOOK_RESOURCES).find(r => r.resourceType == RESOURCE_POWER);
                    if (resource) creep.pickup(resource);
                    m.status = "back";
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
            let storage = myRooms[home].structures.storage;
            if (!creep.pos.isNearTo(storage)) {
                moveCreepTo(creep, storage);
            } else {
                creep.transfer(storage, RESOURCE_POWER);
                creep.suicide();
            }
        }
    }
}

registerCreepRole({
    "pbHarv": runPowerHarvester,
    "pbHeal": runPowerHealer,
    "pbCarry": runPowerCarrier,
})
