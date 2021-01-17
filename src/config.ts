const cfg = {
    TERMINAL_STORE_ENERGY: 50000,
    TERMINAL_MINERAL: 150000,
    ROOM_RESERVE_T3: 10000,
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
        "updateCreepCount": 100
    } as Partial<Record<RoomRoutine, number>>,
    SEGMENTS: {
        stats: 50,
        roomDesign: [10, 11, 12, 13, 14]
    }
}

export default cfg;
