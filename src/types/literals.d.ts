type CreepRole = "carry" | "harvest" | "work" | "build" | "upgrade" | "manage" | "mine"
    | "rhHarv" | "rhReserve" | "rhCarry" | "rhBuild" | "rhGuard"
    | "claim" | "emergency" | "dismantle" | "attack" | "scout" | "rCarry"
    | "pbHarv" | "pbHeal" | "pbCarry";

type LogLevel = "prompt" | "assert" | "error" | "report" | "info" | "debug" | "silly";


type RoomRoutine = "checkCreepHealth" |
    "checkRefill" | "setConstruction" | "checkRoads" | "fullCheckConstruction" |
    "checkRHConstruction" | "runLabs" | "runLinks" | "updateCreepCount" |
    "fetchLabWork" | "fetchWall" | "runPowerSpawn" | "countStore";

type GlobalRoutine = "runTerminal" | "summaryStats" | "rawMemory" | "observer" |
    "scanPowerBank" | "processPowerBank" |
    "countStore" | "fetchAutoDealOrders";

type GlobalTask = "launchNuke" | "spawnCreep" | "checkLoot" | "setTowerState";

type EnergyWork = "upgrade" | "builder" | "power" | "battery"
