// memory extension samples
// 命名规范：都用动词
type CreepRole = "carry" | "harvest" | "work";
interface CreepMemory {
    role: CreepRole;
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

// 表示房间状态的缓存，可以重新被计算的量
interface RoomState {
    status: "normal" | "energy-emergency"
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
