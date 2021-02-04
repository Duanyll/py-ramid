type CreepRole = "carry" | "harvest" | "work" | "build" | "upgrade" | "manage" | "mine"
    | "rhHarv" | "rhReserve" | "rhCarry" | "rhBuild" | "rhGuard"
    | "claim" | "emergency" | "dismantle" | "attack" | "scout" | "rCarry"
    | "pbHarv" | "pbHeal" | "pbCarry";

type RoomRoutine =
    "checkRefill" | "setConstruction" | "checkRoads" | "fullCheckConstruction" |
    "checkRHConstruction" | "runLabs" | "runBoost" | "runLinks" | "updateCreepCount" |
    "fetchLabWork" | "fetchWall" | "runPowerSpawn" | "countStore" | "checkPower";

type GlobalRoutine = "runTerminal" | "summaryStats" | "rawMemory" | "observer" |
    "scanPowerBank" | "processPowerBank" |
    "countStore" | "fetchAutoDealOrders";


type EnergyWork = "upgrade" | "builder" | "power" | "battery"

interface GlobalTaskParam {
    launchNuke: {
        from: string,
        room: string,
        x: number,
        y: number
    },
    spawnCreep: {
        room: string,
        role: CreepRole,
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
