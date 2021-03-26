
export const LAB_RECIPE: Partial<Record<ResourceConstant, ResourceConstant[]>> = {};
_.forIn(REACTIONS, (res2s, res1) => {
    _.forIn(res2s, (product, res2) => {
        (LAB_RECIPE as any)[product] = [res1, res2];
    });
});

export const BOOST_BODYPART = {} as Record<MineralBoostConstant, BodyPartConstant>;
_.forIn(BOOSTS, (minerals, part) => {
    _.forIn(minerals, (actions, mineral) => BOOST_BODYPART[mineral as MineralBoostConstant] = part as BodyPartConstant)
});

export const CENTER_STRUCTURES = {
    [STRUCTURE_STORAGE]: true,
    [STRUCTURE_TERMINAL]: true,
    [STRUCTURE_FACTORY]: true,
    [STRUCTURE_POWER_SPAWN]: true,
    [STRUCTURE_NUKER]: true,
    [STRUCTURE_LINK]: true
};

export const CREEP_LONG_ACTION = {
    attack: true,
    attackController: true,
    build: true,
    dismantle: true,
    harvest: true,
    heal: true,
    rangedAttack: true,
    rangedHeal: true,
    rangedMassAttack: true,
    repair: true,
    reserveController: true,
    upgradeController: true
}

export const BODYPART_ACTIONS: Partial<Record<BodyPartConstant, [CreepLongAction, number][]>> = {
    work: [["build", BUILD_POWER], ["repair", REPAIR_POWER], ["harvest", HARVEST_POWER], ["upgradeController", UPGRADE_CONTROLLER_POWER], ["dismantle", DISMANTLE_POWER]],
    attack: [["attack", ATTACK_POWER]],
    ranged_attack: [["rangedAttack", RANGED_ATTACK_POWER], ["rangedMassAttack", RANGED_ATTACK_POWER]],
    heal: [["heal", HEAL_POWER], ["rangedHeal", RANGED_HEAL_POWER]],
    claim: [["reserveController", CONTROLLER_RESERVE]]
}
