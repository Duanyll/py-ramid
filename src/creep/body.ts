export const commonWorkerBody: Record<number, BodyPartDescription> = {
    1: [[WORK, 1], [CARRY, 2], [MOVE, 2]],
    2: [[WORK, 2], [CARRY, 2], [MOVE, 4]],
    3: [[WORK, 3], [CARRY, 5], [MOVE, 4]],
    4: [[WORK, 6], [CARRY, 7], [MOVE, 7]],
    5: [[WORK, 6], [CARRY, 7], [MOVE, 7]],
    6: [[WORK, 6], [CARRY, 7], [MOVE, 7]],
    7: [[WORK, 10], [CARRY, 10], [MOVE, 10]],
    8: [[WORK, 10], [CARRY, 10], [MOVE, 10]]
}

export const roomBasicCreepConfig: {
    [rcl: number]: {
        [roleId: string]: {
            role: CreepRole,
            body: BodyPartDescription
        };
    }
} = {
    1: {
        work1: { role: "work", body: commonWorkerBody[1] },
        work2: { role: "work", body: commonWorkerBody[1] },
        work3: { role: "work", body: commonWorkerBody[1] },
        work4: { role: "work", body: commonWorkerBody[1] },
        upgr1: { role: "upgrade", body: commonWorkerBody[1] },
        upgr2: { role: "upgrade", body: commonWorkerBody[1] },
    },
    2: {
        work1: { role: "work", body: commonWorkerBody[2] },
        work2: { role: "work", body: commonWorkerBody[2] },
        work3: { role: "work", body: commonWorkerBody[2] },
        work4: { role: "work", body: commonWorkerBody[2] },
        upgr1: { role: "upgrade", body: commonWorkerBody[2] },
        upgr2: { role: "upgrade", body: commonWorkerBody[2] },
    },
    3: {
        work1: { role: "work", body: commonWorkerBody[3] },
        work2: { role: "work", body: commonWorkerBody[3] },
        work3: { role: "work", body: commonWorkerBody[3] },
        work4: { role: "work", body: commonWorkerBody[3] },
        upgr1: { role: "upgrade", body: commonWorkerBody[3] },
        upgr2: { role: "upgrade", body: commonWorkerBody[3] },
    },
    4: {
        harv1: { role: "harvest", body: commonWorkerBody[4] },
        harv2: { role: "harvest", body: commonWorkerBody[4] },
        build1: { role: "build", body: commonWorkerBody[4] },
        build2: { role: "build", body: commonWorkerBody[4] },
        carry1: { role: "carry", body: [[CARRY, 16], [MOVE, 8]] },
        upgr1: { role: "upgrade", body: commonWorkerBody[4] },
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


export const roleBodies: Partial<Record<CreepRole, BodyPartDescription>> = {
    "rhHarv": [[WORK, 10], [CARRY, 4], [MOVE, 5]],
    "rhCarry": [[WORK, 1], [CARRY, 31], [MOVE, 16]],
    "rhReserve": [[CLAIM, 5], [MOVE, 5]],
    "rhGuard": [[TOUGH, 2], [MOVE, 8], [RANGED_ATTACK, 2], [HEAL, 4]],
    "rhBuild": [[WORK, 10], [CARRY, 10], [MOVE, 10]],

    "pbHarv": [[MOVE, 25], [ATTACK, 25]],
    "pbHeal": [[MOVE, 16], [HEAL, 16]],
    "pbCarry": [[CARRY, 25], [MOVE, 25]],

    "emergency": commonWorkerBody[0],
    "mine": [[WORK, 12], [MOVE, 6]],
}

export const roomHelperCreepConfig: {
    [rcl: number]: {
        count: number;
        body: BodyPartDescription
    }
} = {
    3: { count: 4, body: commonWorkerBody[3] },
    4: { count: 2, body: commonWorkerBody[4] },
    5: { count: 2, body: commonWorkerBody[5] },
    6: { count: 2, body: commonWorkerBody[6] },
    7: { count: 2, body: commonWorkerBody[7] },
    8: { count: 2, body: commonWorkerBody[8] },
}
