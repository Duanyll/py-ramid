import { RoomInfo } from "room/roomInfo";
import Logger from "utils";
import { BOOST_BODYPART } from "utils/constants";
import { moveCreepTo } from "./movement";
import roles from "./roles";

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

export function runCreep(creep: Creep, room?: RoomInfo) {
    if (creep.spawning) return;
    if (creep.memory.boost?.length) {
        getCreepBoosted(creep);
        return;
    }
    const role = creep.memory.role;
    if (!roles[role]) {
        Logger.error(`Unknown creep role: ${role} for ${creep.name}`);
        return;
    }
    roles[role](creep, room);
}
