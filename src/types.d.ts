// memory extension samples
// 命名规范：都用动词
type CreepRole = "carry" | "harvest" | "work" | "build" | "upgrade" | "manage";
interface CreepMemory {
    role: CreepRole;
    target?: string;
    roleId?: string;
    room?: string;
}

interface Memory {
    age: number;
}

type LoopCallback = "checkCreepHealth" | "summatyStats";
type DelayCallback = "checkRefill" | "setConstruction";
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

// 表示房间状态的缓存，可以重新被计算的量
interface RoomState {
    status: "normal" | "energy-emergency";
    refillState: { [s: string]: number };
    wallHits: number;
}

interface RoomDesign {
    matrix: string[];
    center: RoomPosition;
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
    }
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
    eventTimer: { [time: number]: RoomCallback[] };
    moveQueue: MoveRequest[];
    spawnQueue: SpawnRequest[];
    design: RoomDesign;
    state: RoomState;
    stats: {
        current: RoomStats;
        history: RoomStats[];
    };
    rcl: number;
}

// `global` extension samples
declare namespace NodeJS {
    interface Global {
        Game: Game;
        age: number;
        log: any;
    }
}
