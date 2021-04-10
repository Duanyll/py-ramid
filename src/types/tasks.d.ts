type CreepRoleType = "carry" | "harvest" | "work" | "build" | "upgrade" | "manage" | "mine"
    | "claim" | "emergency" | "dismantle" | "attack" | "scout" | "rCarry" | "cleaner"
    | "pbHarv" | "pbHeal" | "pbCarry"
    | "xUpgrade";

type RoomRoutineType =
    "checkRefill" | "setConstruction" | "checkRoads" | "fullCheckConstruction" |
    "checkRHConstruction" | "runLabs" | "runBoost" | "runLinks" | "updateCreepCount" |
    "fetchLabWork" | "fetchWall" | "runPowerSpawn" | "countStore" | "checkPower" |
    "runFactory" | "scanInvaders";

type GlobalRoutine = "runTerminal" | "summaryStats" | "rawMemory" | "observer" |
    "scanPowerBank" | "processPowerBank" |
    "countStore" | "fetchAutoDealOrders" |
    "clearCreepInfoStore";

type EnergyWork = "upgrade" | "builder" | "power" | "battery"

type RoomResourceTask = "refill" | "boost" | "lab" | "factory"

interface GlobalTaskParam {
    launchNuke: {
        from: string,
        room: string,
        x: number,
        y: number
    },
    spawnCreep: {
        room: string,
        role: CreepRoleType,
        body?: BodyPartDescription,
        param: Parameters<import("room/roomInfo").RoomInfo["requestSpawn"]>[1]
    },
    checkLoot: {
        flag: string,
        home: string,
        creepRun: number
    },
    setTowerState: {
        room: string,
        state: boolean
    }
}
type GlobalTask = keyof GlobalTaskParam;
