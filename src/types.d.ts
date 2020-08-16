// memory extension samples
interface CreepMemory {
}

interface Memory {
}

interface RoomCallback {
    type: string;
    param: [];
}

// 命名规范：都用动词
type CreepType = "carry" | "harvest" | "work";

interface SpawnRequest {
    type: CreepType;
    memory: CreepMemory;
    name: string;
}

// 表示房间状态的缓存，可以重新被计算的量
interface RoomState {
    // refillEnergyInCarrier: number;
}

interface RoomDesign {
    structures: string[];
    center: RoomPosition;
}

interface RoomMemory {
    eventTimer: { [time: number]: RoomCallback[] };
    moveQueue: { from: string, to: string, type: ResourceConstant, amount: number, callback?: RoomCallback }[];
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
