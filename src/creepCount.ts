import { TERMINAL_MINERAL } from "config";
import { RoomInfo, registerRoomRoutine } from "roomInfo";

const workerBody: Record<number, BodyPartDescription> = {
    1: [[WORK, 1], [CARRY, 2], [MOVE, 2]],
    2: [[WORK, 2], [CARRY, 2], [MOVE, 4]],
    3: [[WORK, 3], [CARRY, 5], [MOVE, 4]],
    4: [[WORK, 6], [CARRY, 7], [MOVE, 7]],
    5: [[WORK, 6], [CARRY, 7], [MOVE, 7]],
    6: [[WORK, 6], [CARRY, 7], [MOVE, 7]],
    7: [[WORK, 10], [CARRY, 10], [MOVE, 10]],
    8: [[WORK, 10], [CARRY, 10], [MOVE, 10]]
}

export const creepRolesForLevel: {
    [rcl: number]: {
        [roleId: string]: {
            role: CreepRole,
            body: BodyPartDescription
        };
    }
} = {
    1: {
        work1: { role: "work", body: workerBody[1] },
        work2: { role: "work", body: workerBody[1] },
        work3: { role: "work", body: workerBody[1] },
        work4: { role: "work", body: workerBody[1] },
        upgr1: { role: "upgrade", body: workerBody[1] },
        upgr2: { role: "upgrade", body: workerBody[1] },
    },
    2: {
        work1: { role: "work", body: workerBody[2] },
        work2: { role: "work", body: workerBody[2] },
        work3: { role: "work", body: workerBody[2] },
        work4: { role: "work", body: workerBody[2] },
        upgr1: { role: "upgrade", body: workerBody[2] },
        upgr2: { role: "upgrade", body: workerBody[2] },
    },
    3: {
        work1: { role: "work", body: workerBody[3] },
        work2: { role: "work", body: workerBody[3] },
        work3: { role: "work", body: workerBody[3] },
        work4: { role: "work", body: workerBody[3] },
        upgr1: { role: "upgrade", body: workerBody[3] },
        upgr2: { role: "upgrade", body: workerBody[3] },
    },
    4: {
        harv1: { role: "harvest", body: workerBody[4] },
        harv2: { role: "harvest", body: workerBody[4] },
        build1: { role: "build", body: workerBody[4] },
        build2: { role: "build", body: workerBody[4] },
        carry1: { role: "carry", body: [[CARRY, 16], [MOVE, 8]] },
        upgr1: { role: "upgrade", body: workerBody[4] },
    },
    5: {
        harv1: { role: "harvest", body: [[WORK, 8], [CARRY, 4], [MOVE, 6]] },
        harv2: { role: "harvest", body: [[WORK, 6], [CARRY, 10], [MOVE, 8]] },
        build1: { role: "build", body: [[WORK, 8], [CARRY, 8], [MOVE, 8]] },
        build2: { role: "build", body: [[WORK, 8], [CARRY, 8], [MOVE, 8]] },
        carry1: { role: "carry", body: [[CARRY, 24], [MOVE, 12]] },
        upgr1: { role: "upgrade", body: [[WORK, 12], [CARRY, 4], [MOVE, 8]] },
    },
    6: {
        harv1: { role: "harvest", body: [[WORK, 8], [CARRY, 4], [MOVE, 6]] },
        harv2: { role: "harvest", body: [[WORK, 10], [CARRY, 10], [MOVE, 10]] },
        build1: { role: "build", body: [[WORK, 10], [CARRY, 10], [MOVE, 10]] },
        carry1: { role: "carry", body: [[CARRY, 24], [MOVE, 12]] },
        center: { role: "manage", body: [[CARRY, 16]] },
        upgr1: { role: "upgrade", body: [[WORK, 12], [CARRY, 4], [MOVE, 8]] },
    },
    7: {
        harv1: { role: "harvest", body: [[WORK, 12], [CARRY, 4], [MOVE, 8]] },
        harv2: { role: "harvest", body: [[WORK, 12], [CARRY, 4], [MOVE, 8]] },
        build1: { role: "build", body: [[WORK, 12], [CARRY, 12], [MOVE, 12]] },
        carry1: { role: "carry", body: [[CARRY, 32], [MOVE, 16]] },
        center: { role: "manage", body: [[CARRY, 16]] },
        upgr1: { role: "upgrade", body: [[WORK, 12], [CARRY, 4], [MOVE, 8]] },
    },
    8: {
        harv1: { role: "harvest", body: [[WORK, 12], [CARRY, 4], [MOVE, 8]] },
        harv2: { role: "harvest", body: [[WORK, 12], [CARRY, 4], [MOVE, 8]] },
        build1: { role: "build", body: [[WORK, 16], [CARRY, 16], [MOVE, 16]] },
        carry1: { role: "carry", body: [[CARRY, 32], [MOVE, 16]] },
        center: { role: "manage", body: [[CARRY, 16]] },
        upgr1: { role: "upgrade", body: [[WORK, 12], [CARRY, 4], [MOVE, 8]] },
    },
}

/*
    "work": source => refill, build, upgrade
    "upgrade": controllerLink, storage, source => upgrade
    "harvest": source => sourceLink, storage
    "build": storage, source => build
    "carry": storage => refill; moveQueue
    "center": moveQueue

    tower: attack, repair roads
    build: build, repair walls and ramparts
    link: sourceLink[0] => controllerLink, sourceLink[1] => centerLink
*/

export const remoteHarvesterBody: BodyPartDescription =
    [[WORK, 10], [CARRY, 4], [MOVE, 5]];
export const remoteCarrierBody: BodyPartDescription =
    [[WORK, 1], [CARRY, 31], [MOVE, 16]];
export const remoteReserverBody: BodyPartDescription =
    [[CLAIM, 5], [MOVE, 5]];
export const remoteGuardBody: BodyPartDescription =
    [[TOUGH, 2], [MOVE, 8], [RANGED_ATTACK, 2], [HEAL, 4]];
export const remoteBuilderBody: BodyPartDescription =
    [[WORK, 10], [CARRY, 10], [MOVE, 10]];

export const helperCreepCount: {
    [rcl: number]: {
        count: number;
        body: BodyPartDescription
    }
} = {
    3: { count: 4, body: workerBody[3] },
    4: { count: 2, body: workerBody[4] },
    5: { count: 2, body: workerBody[5] },
    6: { count: 2, body: workerBody[6] },
    7: { count: 2, body: workerBody[7] },
    8: { count: 2, body: workerBody[8] },
}

export const emergencyCreepBody: BodyPartDescription = workerBody[0];

export const minerBody: BodyPartDescription = [[WORK, 12], [MOVE, 6]];

export const pbHarvesterBody: BodyPartDescription = [[MOVE, 25], [ATTACK, 25]];
export const pbHealerBody: BodyPartDescription = [[MOVE, 16], [HEAL, 16]];
export const pbUnibodyBody: BodyPartDescription = [[MOVE, 25], [ATTACK, 11], [HEAL, 14]]
export const pbCarrierBody: BodyPartDescription = [[CARRY, 25], [MOVE, 25]];

function updateRoomCreepCount(room: RoomInfo) {
    room.creepRoleDefs = _.clone(creepRolesForLevel[room.structRcl]);
    if (room.structRcl >= 7 && (room.state.energy.storeMode)) {
        delete room.creepRoleDefs["build1"];
    }
    if (room.structRcl == 8 && !room.state.energy.usage.builder) {
        delete room.creepRoleDefs["build1"];
    }
    if (room.structRcl >= 6 && room.state.enableMining && room.structures.mineral.mineralAmount
        && room.countStore(room.structures.mineral.mineralType) < TERMINAL_MINERAL) {
        room.creepRoleDefs["mine1"] = {
            body: minerBody,
            role: "mine"
        }
    }
    if (room.structRcl >= 8 && !room.state.energy.usage.upgrade) {
        room.creepRoleDefs["upgr1"] = {
            body: [[WORK, 3], [CARRY, 1], [MOVE, 2]],
            role: "upgrade"
        }
    }
    room.delay("updateCreepCount", 100);
}
registerRoomRoutine("updateCreepCount", updateRoomCreepCount);
