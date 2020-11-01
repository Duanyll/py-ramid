/// <reference path="../node_modules/@types/lodash/index.d.ts" />

declare const _: _.LoDashStatic;
declare namespace _ {
    // tslint:disable-next-line no-empty-interface (This will be augmented)
    interface LoDashStatic { }
}

// 命名规范：都用动词
type CreepRole = "carry" | "harvest" | "work" | "build" | "upgrade" | "manage" | "mine"
    | "rhHarv" | "rhReserve" | "rhCarry" | "rhBuild" | "rhGuard"
    | "claim" | "emergency" | "dismantle" | "attack" | "scout";

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
}

interface PowerCreepMemory {
    _move?: {
        dest: { x: number, y: number, room: string };
        time: number;
        path: string;
    }
}

interface Memory {
    age: number;
    roomsToClaim: { from: string, to: string }[];
    roomsToAvoid: { [name: string]: boolean };
    labQueue: {
        recipe: ResourceConstant[],
        amount: number
    }[],
}

type CallbackType = "checkCreepHealth" | "summatyStats" |
    "checkRefill" | "setConstruction" | "checkRoads" | "fullCheckConstruction" |
    "checkRHConstruction" | "runLabs" | "runLinks" | "updateCreepCount" |
    "fetchLabWork";
interface RoomCallback {
    type: CallbackType;
    param?: any[];
}

type BodyPartDescription = { type: BodyPartConstant, count: number }[];

interface SpawnRequest {
    memory: CreepMemory;
    body: BodyPartDescription;
    cost?: number;
    name: string;
}

type RefillableStructure = StructureTower | StructureExtension | StructureSpawn;

interface RoomState {
    status: "normal" | "energy-emergency";
    energyState: "store" | "take";
    energyMode: "upgrade" | "power" | "battery" | "wall",
    lastLinkToController: boolean,
    enableMining: boolean;
    wallHits: number;
    rampartHits: number;
    rampartHitsTarget: number;
    refillFailTime?: number;
    labMode: "disabled" | "boost" | "reaction",
    labContent: ResourceConstant[],
    labRemainAmount: number,
    chargeNuker: boolean
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
    mineralContainer: [number, number]
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
        [name: string]: number;
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
    resource: RoomResource
}

// `global` extension samples
declare namespace NodeJS {
    interface Global {
        logMoveRequest: (roomName: string) => void;
        bookForReserve: () => void;
        resetResource: () => void;
        cancelAllLabs: () => void;
        produceG: (amount: number) => void;
        produceT3: (a: "U" | "L" | "K" | "Z" | "G", b: "O" | "H", amount: number) => void;
        mining: (roomName: string, enable: boolean) => void;
        myRooms: { [name: string]: import("d:/source/py-ramid/src/roomInfo").RoomInfo; };
        reaction: (room: string, mode: "disabled" | "boost" | "reaction", content?: ResourceConstant[], amount?: number) => void;
        rampart: (room: string, strength?: number) => void;
        remainConstructionCount: number;
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
