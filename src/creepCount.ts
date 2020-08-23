export const creepRolesForLevel: {
    [rcl: number]: {
        [roleId: string]: {
            role: CreepRole,
            body: BodyPartDescription
        };
    }
} = {
    1: {
        work1: { role: "work", body: [{ type: "work", count: 1 }, { type: "carry", count: 2 }, { type: "move", count: 2 }] },
        work2: { role: "work", body: [{ type: "work", count: 1 }, { type: "carry", count: 2 }, { type: "move", count: 2 }] },
        work3: { role: "work", body: [{ type: "work", count: 1 }, { type: "carry", count: 2 }, { type: "move", count: 2 }] },
        work4: { role: "work", body: [{ type: "work", count: 1 }, { type: "carry", count: 2 }, { type: "move", count: 2 }] },
        upgr1: { role: "upgrade", body: [{ type: "work", count: 1 }, { type: "carry", count: 2 }, { type: "move", count: 2 }] },
        upgr2: { role: "upgrade", body: [{ type: "work", count: 1 }, { type: "carry", count: 2 }, { type: "move", count: 2 }] },
    },
    2: {
        work1: { role: "work", body: [{ type: "work", count: 2 }, { type: "carry", count: 3 }, { type: "move", count: 3 }] },
        work2: { role: "work", body: [{ type: "work", count: 2 }, { type: "carry", count: 3 }, { type: "move", count: 3 }] },
        work3: { role: "work", body: [{ type: "work", count: 2 }, { type: "carry", count: 3 }, { type: "move", count: 3 }] },
        work4: { role: "work", body: [{ type: "work", count: 2 }, { type: "carry", count: 3 }, { type: "move", count: 3 }] },
        upgr1: { role: "upgrade", body: [{ type: "work", count: 2 }, { type: "carry", count: 3 }, { type: "move", count: 3 }] },
        upgr2: { role: "upgrade", body: [{ type: "work", count: 2 }, { type: "carry", count: 3 }, { type: "move", count: 3 }] },
    },
    3: {
        work1: { role: "work", body: [{ type: "work", count: 3 }, { type: "carry", count: 4 }, { type: "move", count: 4 }] },
        work2: { role: "work", body: [{ type: "work", count: 3 }, { type: "carry", count: 4 }, { type: "move", count: 4 }] },
        work3: { role: "work", body: [{ type: "work", count: 3 }, { type: "carry", count: 4 }, { type: "move", count: 4 }] },
        work4: { role: "work", body: [{ type: "work", count: 3 }, { type: "carry", count: 4 }, { type: "move", count: 4 }] },
        upgr1: { role: "upgrade", body: [{ type: "work", count: 3 }, { type: "carry", count: 4 }, { type: "move", count: 4 }] },
        upgr2: { role: "upgrade", body: [{ type: "work", count: 3 }, { type: "carry", count: 4 }, { type: "move", count: 4 }] },
    },
    4: {
        harv1: { role: "harvest", body: [{ type: "work", count: 6 }, { type: "carry", count: 7 }, { type: "move", count: 7 }] },
        harv2: { role: "harvest", body: [{ type: "work", count: 6 }, { type: "carry", count: 7 }, { type: "move", count: 7 }] },
        build1: { role: "build", body: [{ type: "work", count: 6 }, { type: "carry", count: 7 }, { type: "move", count: 7 }] },
        build2: { role: "build", body: [{ type: "work", count: 6 }, { type: "carry", count: 7 }, { type: "move", count: 7 }] },
        carry1: { role: "carry", body: [{ type: "carry", count: 16 }, { type: "move", count: 8 }] },
        upgr1: { role: "upgrade", body: [{ type: "work", count: 6 }, { type: "carry", count: 7 }, { type: "move", count: 7 }] },
    },
    5: {
        harv1: { role: "harvest", body: [{ type: "work", count: 8 }, { type: "carry", count: 4 }, { type: "move", count: 6 }] },
        harv2: { role: "harvest", body: [{ type: "work", count: 6 }, { type: "carry", count: 10 }, { type: "move", count: 8 }] },
        build1: { role: "build", body: [{ type: "work", count: 8 }, { type: "carry", count: 8 }, { type: "move", count: 8 }] },
        build2: { role: "build", body: [{ type: "work", count: 8 }, { type: "carry", count: 8 }, { type: "move", count: 8 }] },
        carry1: { role: "carry", body: [{ type: "carry", count: 32 }, { type: "move", count: 16 }] },
        upgr1: { role: "upgrade", body: [{ type: "work", count: 8 }, { type: "carry", count: 4 }, { type: "move", count: 6 }] },
    },
    6: {
        harv1: { role: "harvest", body: [{ type: "work", count: 8 }, { type: "carry", count: 4 }, { type: "move", count: 6 }] },
        harv2: { role: "harvest", body: [{ type: "work", count: 8 }, { type: "carry", count: 4 }, { type: "move", count: 6 }] },
        build1: { role: "build", body: [{ type: "work", count: 10 }, { type: "carry", count: 10 }, { type: "move", count: 10 }] },
        build2: { role: "build", body: [{ type: "work", count: 10 }, { type: "carry", count: 10 }, { type: "move", count: 10 }] },
        carry1: { role: "carry", body: [{ type: "carry", count: 32 }, { type: "move", count: 16 }] },
        upgr1: { role: "upgrade", body: [{ type: "work", count: 8 }, { type: "carry", count: 4 }, { type: "move", count: 6 }] },
    },
    7: {
        harv1: { role: "harvest", body: [{ type: "work", count: 12 }, { type: "carry", count: 4 }, { type: "move", count: 8 }] },
        harv2: { role: "harvest", body: [{ type: "work", count: 12 }, { type: "carry", count: 4 }, { type: "move", count: 8 }] },
        build1: { role: "build", body: [{ type: "work", count: 12 }, { type: "carry", count: 12 }, { type: "move", count: 12 }] },
        build2: { role: "build", body: [{ type: "work", count: 12 }, { type: "carry", count: 12 }, { type: "move", count: 12 }] },
        carry1: { role: "carry", body: [{ type: "carry", count: 32 }, { type: "move", count: 16 }] },
        center: { role: "manage", body: [{ type: "carry", count: 50 }] },
        upgr1: { role: "upgrade", body: [{ type: "work", count: 12 }, { type: "carry", count: 4 }, { type: "move", count: 8 }] },
    },
    8: {
        harv1: { role: "harvest", body: [{ type: "work", count: 16 }, { type: "carry", count: 4 }, { type: "move", count: 10 }] },
        harv2: { role: "harvest", body: [{ type: "work", count: 16 }, { type: "carry", count: 4 }, { type: "move", count: 10 }] },
        build1: { role: "build", body: [{ type: "work", count: 16 }, { type: "carry", count: 16 }, { type: "move", count: 16 }] },
        build2: { role: "build", body: [{ type: "work", count: 16 }, { type: "carry", count: 16 }, { type: "move", count: 16 }] },
        carry1: { role: "carry", body: [{ type: "carry", count: 32 }, { type: "move", count: 16 }] },
        center: { role: "manage", body: [{ type: "carry", count: 50 }] },
        upgr1: { role: "upgrade", body: [{ type: "work", count: 16 }, { type: "carry", count: 4 }, { type: "move", count: 10 }] },
    }
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