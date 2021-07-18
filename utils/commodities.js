const _ = require('lodash')
const C = require('./constants')

const BASIC_RESOURCE = ['silicon', 'metal', 'biomass', 'mist', 'Z', 'K', 'U', 'L', 'O', 'H', 'X', 'energy']

const PRICE = {
    LH2O: 3.748,
    KH: 1.03,
    UH: 0.704,
    ZH: 0.231,
    XZHO2: 13.062,
    KH2O: 2.519,
    biomass: 50.189,
    XLHO2: 6.794,
    hydraulics: 480798.743,
    mist: 10.604,
    ZHO2: 2.039,
    ZH2O: 1.968,
    XKH2O: 15.611,
    tube: 12192.613,
    fixtures: 27566.223,
    XGHO2: 9.249,
    condensate: 238.509,
    concentrate: 2765.741,
    XZH2O: 9.44,
    organoid: 409568.506,
    wire: 509.135,
    LHO2: 2.632,
    UL: 1.581,
    U: 0.695,
    phlegm: 9176.021,
    X: 0.867,
    battery: 4.413,
    power: 20.473,
    XLH2O: 6.887,
    ops: 1.065,
    cpuUnlock: 4467290.324,
    G: 7.785,
    XGH2O: 19.946,
    oxidant: 2.3,
    UHO2: 2.839,
    reductant: 1.436,
    purifier: 4.674,
    UO: 1.502,
    energy: 0.511,
    ZK: 0.636,
    zynthium_bar: 0.925,
    O: 0.257,
    Z: 0.129,
    metal: 55.27,
    H: 0.603,
    ghodium_melt: 21.757,
    KO: 0.686,
    crystal: 26.228,
    LH: 0.921,
    utrium_bar: 1.525,
    emanation: 146613.976,
    UH2O: 2.683,
    L: 0.209,
    liquid: 4.124,
    device: 536575.584,
    frame: 107456.684,
    transistor: 5570.561,
    alloy: 533.973,
    OH: 1.839,
    XUHO2: 12.104,
    tissue: 47759.019,
    pixel: 192918755.435,
    accessKey: 38625000,
    lemergium_bar: 1.457,
    essence: 262362.275,
    KHO2: 2.288,
    K: 0.268,
    circuit: 315176.217,
    GHO2: 4.024,
    composite: 4.963,
    GH: 2.373,
    cell: 490.852,
    spirit: 50661.608,
    GO: 0.616,
    extract: 17011.094,
    machine: 825011.809,
    muscle: 185184.449,
    silicon: 41,
    XKHO2: 13.054,
    GH2O: 4.466,
    organism: 717723.136,
    LO: 0.699,
    microchip: 141922.059,
    switch: 5665.459,
    keanium_bar: 0.333,
    XUH2O: 10.165
}

const LAB_RECIPE = {};
_.forIn(C.REACTIONS, (res2s, res1) => {
    _.forIn(res2s, (product, res2) => {
        LAB_RECIPE[product] = [res1, res2];
    });
});

function calc(res) {
    if (BASIC_RESOURCE.includes(res)) {
        return PRICE[res];
    } else if (res in LAB_RECIPE) {
        return _.sumBy(LAB_RECIPE[res], i => calc(i));
    } else if (res in C.COMMODITIES) {
        let recipe = C.COMMODITIES[res];
        let cur = 0;
        for (const res in recipe.components) {
            cur += recipe.components[res] * calc(res);
        }
        cur /= recipe.amount;
        return cur;
    } else {
        console.log(`can't produce ${res}`);
        return NaN;
    }
}

const PROFIT = [];

for (const res in PRICE) {
    let cost = calc(res);
    let profit = PRICE[res] - cost;
    let rate = profit / cost;
    PROFIT.push([res, profit, rate]);
}

let res = _.sortBy(PROFIT, i => -i[2]);

for (const i of res) {
    console.log(`${_.padEnd(i[0], 12)}\t${_.padEnd(_.round(i[1], 2), 12)}\t${_.round(i[2], 2)}`);
}
