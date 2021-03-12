import buildTime from "consts:buildTime";

const cfg = {

/* ------------------------------- basic info ------------------------------- */

    BUILD_TIME: buildTime,
    DEFAULT_CONTROLLER_SIGN: `🔺Py-Ramid🔺`,
    USER_NAME: "duanyll",
    DEFAULT_PLAYER_WHITELIST: {
        "Administrator-": true,
        "Asixa": true
    } as Record<string, boolean>,
    SEGMENTS: {
        stats: 50,
        roomDesign: [10, 11, 12, 13, 14]
    },

/* -------------------------------- routines -------------------------------- */

    WALL_BUILD_STEP: 30000,
    GLOBAL_ROUTINE_DELAY: {
        "countStore": 5000,
        "fetchAutoDealOrders": 100,
        "runTerminal": TERMINAL_COOLDOWN,
        "scanPowerBank": 100,
        "summaryStats": 20
    } as Partial<Record<GlobalRoutine, number>>,
    ROOM_ROUTINE_DELAY: {
        "checkRefill": 200,
        "checkRoads": 500,
        "fetchLabWork": 1000,
        "fetchWall": 5000,
        "fullCheckConstruction": 5000,
        "setConstruction": 1000,
        "updateCreepCount": 100,
        "runLabs": 200,
        "runBoost": 20,
        "checkPower": 50,
        "runFactory": 50,
        "countStore": 2000
    } as Partial<Record<RoomRoutineType, number>>,

/* -------------------------------- resource -------------------------------- */

    MARKET_RESERVE: 30_000,
    LAB_REACTION_AMOUNT: 6000,
    TERMINAL_MINERAL: 150_000,
    TERMINAL_EXPORT_DEFAULT: 8000,
    TERMINAL_EXPORT_MINERAL: 20_000,
    FACTORY_COMPONENT_AMOUNT: 5000,
    ENERGY: {
        TERMINAL: 50_000,
        REDLINE: 80_000,
        LOW: 100_000,
        PRIMARY_WORK: 120_000,
        SECONDARY_WORK: 140_000,
        FORCE_UPGRADE: 200_000,
        FORCE_BATTERY: 300_000
    },
    ROOM_RESERVE: {
        "G": 10_000,
        "XGHO2": 10_000,
        "XKHO2": 10_000,
        "XKH2O": 10_000,
        "XLH2O": 10_000,
        "XLHO2": 10_000,
        "XUH2O": 10_000,
        "XZH2O": 10_000,
        "XZHO2": 10_000,
        "ops": 50_000
    } as Partial<Record<ResourceConstant, number>>,

/* --------------------------------- market --------------------------------- */

    MARKET_ADD_PRICE_TIME: 500,
    ENERGY_PRICE: 0.5
}

export default cfg;
