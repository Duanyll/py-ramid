// 命名规范：都用动词
type CreepRole = "carry" | "harvest" | "work" | "build" | "upgrade" | "manage" | "remoteHarvest" | "claim" | "emergency";
interface CreepMemory {
    role: CreepRole;
    target?: string;
    roleId?: string;
    room?: string;
}

interface Memory {
    age: number;
    roomsToClaim: { from: string, to: string }[];
}

type LoopCallback = "checkCreepHealth" | "summatyStats";
type DelayCallback = "checkRefill" | "setConstruction" | "checkRoads";
type CallbackType = LoopCallback | DelayCallback;
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
    refillState: { [s: string]: number };
    wallHits: number;
    roleSpawnStatus: { [roleId: string]: "ok" | "spawning" | "disabled" }
    roadToRepair: string[];
    refillFailTime?: number;
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
}

interface RoomStats {
    energy: {
        spawnCost: number;
        buildStructureCost: number;
        repairCost: number;
        towerCost: number;

        localHarvestIncome: number;
        remoteHarvestIncome: number;
    }
}

interface MoveRequest {
    from: Id<AnyStoreStructure>;
    to: Id<AnyStoreStructure>;
    type: ResourceConstant;
    amount: number;
    callback?: RoomCallback;
}

interface RoomMemory {
    tasks: {
        [name: string]: number;
    }
    moveQueue: MoveRequest[];
    spawnQueue: SpawnRequest[];
    design: RoomDesign;
    state: RoomState;
    stats: {
        current: RoomStats;
        history: RoomStats[];
    };
    rcl: number;
    remoteSources: {
        id: string;
        room: string;
    }[];
    helperRoom?: string;
}

// `global` extension samples
declare namespace NodeJS {
    interface Global {
        Game: Game;
        age: number;
        log: any;
        reloadRoomsNextTick?: boolean;
    }
}
