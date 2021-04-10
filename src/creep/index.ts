import { RoomInfo } from "room/roomInfo";
import Logger, { ErrorMapper } from "utils";
import { BOOST_BODYPART } from "utils/constants";
import { CreepRoleDriver, getCreepRole } from "./role";

function getCreepBoosted(creep: Creep) {
    let room = creep.room.info;
    let mineral = _.last(creep.memory.boost);
    let mineralIndex = _.findIndex(room.state.lab.boost, { type: mineral });
    if (mineralIndex == -1) {
        Logger.error(`${room.name}: No boost info for ${mineral}!`);
        creep.memory.boost.pop();
        return;
    }
    let lab = room.structures.labs.output[mineralIndex];
    if (lab) {
        if (creep.goTo(lab)) {
            const count = creep.getActiveBodyparts(BOOST_BODYPART[mineral]);
            if (lab.mineralType == mineral
                && lab.store[lab.mineralType] >= count * LAB_BOOST_MINERAL
                && lab.store["energy"] >= count * LAB_BOOST_ENERGY) {
                if (lab.boostCreep(creep, count) == OK) {
                    creep.memory.boost.pop();
                    room.storeCurrent.add(mineral, -count * LAB_BOOST_MINERAL);
                    let info = room.state.lab.boost.find(i => i.type == mineral);
                    if (info) {
                        info.amount -= count * LAB_BOOST_MINERAL;
                    }
                    Logger.silly(`${room.name}: Boost creep ${creep.name} with ${mineral}.`);
                    return;
                }
            }
        }
    }
}

let creepDrivers = {} as Record<string, CreepRoleDriver>;

export function runCreep(creep: Creep, room?: RoomInfo) {
    if (creep.spawning) return;
    if (creep.memory.boost?.length) {
        getCreepBoosted(creep);
        return;
    }
    let driver = creepDrivers[creep.name];
    if (!driver) {
        let ctor = getCreepRole(creep.memory.role);
        if (!ctor) {
            Logger.error(`${creep.name}: unknown creep role ${creep.memory.role}`);
        }
        driver = creepDrivers[creep.name] = new ctor(creep.name);
    }
    ErrorMapper.wrap(() => driver.run(creep, room))();
}

export function clearCreepMemory() {
    for (const name in creepDrivers) {
        if (!(name in Game.creeps)) {
            creepDrivers[name].die?.();
            delete creepDrivers[name];
            delete Memory.creeps[name];
        }
    }
}
