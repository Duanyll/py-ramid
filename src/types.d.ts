declare const _: import("lodash").LoDashStatic;

type CreepRole = "carry" | "harvest" | "work" | "build" | "upgrade" | "manage" | "mine"
    | "rhHarv" | "rhReserve" | "rhCarry" | "rhBuild" | "rhGuard"
    | "claim" | "emergency" | "dismantle" | "attack" | "scout" | "rCarry"
    | "pbHarv" | "pbHeal" | "pbCarry";

interface CreepMemory {
    _move?: {
        dest: { x: number, y: number, room: string };
        time: number;
        path: string;
    }
    role: CreepRole;
    target?: string;
    roleId?: string;
    room?: string;
    group?: string;
}

interface PowerCreepMemory {
    _move?: {
        dest: { x: number, y: number, room: string };
        time: number;
        path: string;
    }
}

type LogLevel = "prompt" | "assert" | "error" | "report" | "info" | "debug" | "silly";

interface PowerBankInfo {
    discoverTime: number,
    decayTime: number,
    power: number,
    status: "dropped" | "waiting" | "harvesting" | "harvested";
    pos: { room: string, x: number, y: number },
    harvGroupCount?: number,
    carryGroup?: string,
    harvRoom?: string,

    distance?: number,
    remainHits?: number
}

interface Memory {
    logLevel: LogLevel;
    age: number;
    genPixel: boolean;
    // roomsToClaim: { from: string, to: string }[];
    roomsToAvoid: { [name: string]: boolean };
    roomCost: { [name: string]: number };
    labQueue: {
        recipe: ResourceConstant[],
        amount: number
    }[],
    labQueueBuffer: Partial<Record<ResourceConstant, number>>;
    routine: { [type in GlobalRoutine]?: number };
    tasks: {
        [time: number]: { type: GlobalTask, param: any }[]
    },
    mining: {
        power: {
            roomLock: { [room: string]: boolean };
            targets: string[];
            info: {
                [id: string]: PowerBankInfo
            }
        },
        deposit: {
            from: { [room: string]: string };
            targets: string[];
            info: {}
        }
    },
    market: {
        enableAutoDeal: boolean,
        autoDeal: {
            [type in ResourceConstant]?: {
                basePrice: number,
                reserveAmount: number,
                orders?: string[],
                updateTime: number
            }
        }
    }
}

type RoomRoutine = "checkCreepHealth" |
    "checkRefill" | "setConstruction" | "checkRoads" | "fullCheckConstruction" |
    "checkRHConstruction" | "runLabs" | "runLinks" | "updateCreepCount" |
    "fetchLabWork" | "fetchWall" | "runPowerSpawn" | "countStore";

type GlobalRoutine = "runTerminal" | "summaryStats" | "rawMemory" | "observer" |
    "scanPowerBank" | "processPowerBank" |
    "countStore" | "fetchAutoDealOrders";

type GlobalTask = "launchNuke" | "spawnCreep" | "checkLoot" | "setTowerState";

type BodyPartDescription = [BodyPartConstant, number, ResourceConstant?][];

interface SpawnRequest {
    memory: CreepMemory;
    body: BodyPartDescription;
    cost?: number;
    name: string;
}

type RefillableStructure = StructureTower | StructureExtension | StructureSpawn;

type EnergyWork = "upgrade" | "builder" | "power" | "battery"

interface RoomState {
    status: "normal" | "energy-emergency";
    // energyMode: "upgrade" | "power" | "battery" | "wall",
    energy: {
        storeMode: boolean,
        usage: {
            [type in EnergyWork]?: boolean
        },
        primary: EnergyWork[],
        primaryUpdateTime: number
        activeCount: number;
    }
    lastLinkToController: boolean,
    enableMining: boolean;
    refillFailTime?: number;
    labMode: "disabled" | "boost" | "reaction",
    labContent: ResourceConstant[],
    labRemainAmount: number,
    chargeNuker: boolean,
    autoProcessPower: boolean,
    disableTower?: boolean,
    mineralToTransport?: number;
}

interface RoomDesign {
    version: number;
    matrix: string[];
    center: [number, number];
    currentStage: number;
    stages: {
        rcl: number;
        list: {
            type: BuildableStructureConstant;
            x: number;
            y: number;
            name?: string;
        }[]
    }[],
    links: {
        sourceLink: [number, number][];
        centerLink: [number, number];
        controllerLink: [number, number];
    },
    sources: [number, number][],
    centerSpawn: [number, number];
    remoteSources: {
        sources: { x: number, y: number, room: string }[];
        containers: { x: number, y: number, room: string }[];
        route: {
            [room: string]: { x: number, y: number }[];
        }
    },
    labs: [number, number][],
    mineralContainer: [number, number],
    walls: { x: number, y: number }[],
    ramparts: { x: number, y: number }[]
}

interface RoomResource {
    // 在 storage 里长期储备垫底的资源
    reserve: { [type: string]: number },
    // 需要传送到当前房间的资源
    import: { [type: string]: number },
    // 在 terminal 里面放置相应数量资源以供出口
    export: { [type: string]: number },
    // 这些资源已经被房间内的需求预定，不要出口
    lock: { [type: string]: number },
    produce: { [type: string]: boolean }
}

interface RoomMemory {
    tasks: {
        [name in RoomRoutine]?: number;
    }
    spawnQueue: SpawnRequest[];
    design: RoomDesign;
    state: RoomState;
    rcl: number;
    helperRoom?: string;
    remoteHarvest: {
        [room: string]: {
            sources: [number, number][];
            status: "disabled" | "waiting" | "building" | "working"
        }
    },
    resource: RoomResource,
    sign?: string
}

// `global` extension samples
declare namespace NodeJS {
    interface Global {
        lastException: number;
        autoSell: (type: ResourceConstant, price: number | false, reserve?: number) => void;
        produce: (type: ResourceConstant, amount: number, noBuffer?: boolean) => boolean;
        cancelLab: (roomName: string) => void;
        store: import("resource").GlobalStoreManager;
        unclaim: (roomName: string, keep: boolean) => void;
        yes: (key: number) => void;
        schedule: (type: GlobalTask, delay: number, param: any) => void;
        delay: (type: GlobalRoutine, time: number) => void;
        pbMining: (rooms: string[] | "clear") => void;
        burnPower: (roomName: string, amount: number | false | "auto") => void;
        disableTower: (room: string, time?: number) => void;
        loot: (flag: string, home: string, creepRun: number) => void;
        nuke: (delay: number, from: string, room: string, x: number, y: number) => void;
        logLevel: (level: LogLevel) => LogLevel;
        logLabs: () => void;
        recordWallDesign: (roomName: string, x1?: number, y1?: number, x2?: number, y2?: number) => void;
        logMoveRequest: (roomName: string) => void;
        resetResource: (roomName: string) => void;
        cancelAllLabs: () => void;
        mining: (roomName: string, enable: boolean) => void;
        myRooms: { [name: string]: import("roomInfo").RoomInfo; };
        reaction: (room: string, mode: "disabled" | "boost" | "reaction", content?: ResourceConstant[], amount?: number) => void;
        rampart: (room: string, strength?: number) => void;
        sendClaimer: (roomName: string, target: string) => void;
        sendDismantler: (roomName: string, target: string) => void;
        sendAttacker: (roomName: string, target: string) => void;
        Game: Game;
        age: number;
        log: any;
        reloadRoomsNextTick?: boolean;
        _: _.LoDashStatic;
    }
}

interface Room {
    readonly info: import("roomInfo").RoomInfo;
}
