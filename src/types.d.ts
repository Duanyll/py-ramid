/// <reference path="../node_modules/@types/lodash/index.d.ts" />

declare const _: _.LoDashStatic;
declare namespace _ {
    // tslint:disable-next-line no-empty-interface (This will be augmented)
    interface LoDashStatic { }
}

// 命名规范：都用动词
type CreepRole = "carry" | "harvest" | "work" | "build" | "upgrade" | "manage"
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
}

type CallbackType = "checkCreepHealth" | "summatyStats" |
    "checkRefill" | "setConstruction" | "checkRoads" | "fullCheckConstruction" |
    "checkRHConstruction" | "runLabs";
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
    // refillState: { [s: string]: number };
    wallHits: number;
    rampartHits: number;
    rampartHitsTarget: number;
    // roleSpawnStatus: { [roleId: string]: "ok" | "spawning" | "disabled" }
    // roadToRepair: string[];
    refillFailTime?: number;
    labMode: "disabled" | "boost" | "reaction",
    labContent: ResourceConstant[]
}

interface RoomDesign {
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
    labs: [number, number][]
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
    }
}

// `global` extension samples
declare namespace NodeJS {
    interface Global {
        setLabs: (room: string, mode: "disabled" | "boost" | "reaction", content: ResourceConstant[]) => void;
        enableRampartBuilding: (room: string, strength?: number) => void;
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
