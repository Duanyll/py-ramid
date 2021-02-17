import buildTime from "consts:buildTime";

const cfg = {
    TERMINAL_MINERAL: 150000,
    ROOM_RESERVE_T3: 10000,
    ROOM_RESERVE_OPS: 20000,
    TERMINAL_EXPORT_AMOUNT: 8000,
    WALL_BUILD_STEP: 30000,
    DEFAULT_CONTROLLER_SIGN: `🔺Py-Ramid🔺`,
    USER_NAME: "duanyll",
    MARKET_RESERVE: 30000,
    LAB_CLEAR_THRESHOLD: 8000,
    DEFAULT_PLAYER_WHITELIST: {
        "Administrator-": true,
        "Asixa": true
    } as Record<string, boolean>,
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
    SEGMENTS: {
        stats: 50,
        roomDesign: [10, 11, 12, 13, 14]
    },
    BUILD_TIME: buildTime,
    FACTORY_COMPONENT_AMOUNT: 5000,
    ENERGY: {
        TERMINAL: 50_000,
        REDLINE: 80_000,
        LOW: 100_000,
        PRIMARY_WORK: 120_000,
        SECONDARY_WORK: 140_000,
        FORCE_UPGRADE: 200_000,
        FORCE_BATTERY: 300_000
    }
}

export default cfg;
