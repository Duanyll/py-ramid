// memory extension samples
// 命名规范：都用动词
type CreepRole = "carry" | "harvest" | "work";
interface CreepMemory {
    role: CreepRole;
    target: string;
}

interface Memory {
}

interface RoomCallback {
    type: string;
    param: [];
}

interface SpawnRequest {
    type: CreepRole;
    memory: CreepMemory;
    name: string;
}

type RefillableStructure = StructureTower | StructureExtension | StructureSpawn;

// 表示房间状态的缓存，可以重新被计算的量
interface RoomState {
    status: "normal" | "energy-emergency",
    refillState: { [s: string]: number }
}

interface RoomDesign {
    structures: string[];
    center: RoomPosition;
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
    state: RoomState
}

// `global` extension samples
declare namespace NodeJS {
    interface Global {
        age: number;
        log: any;
    }
}
