
export const LAB_RECIPE: Partial<Record<ResourceConstant, ResourceConstant[]>> = {};
_.forIn(REACTIONS, (res2s, res1) => {
    _.forIn(res2s, (product, res2) => {
        // @ts-ignore
        LAB_RECIPE[product] = [res1, res2];
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
