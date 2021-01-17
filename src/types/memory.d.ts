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
    },
    playerWhiteList: Record<string, boolean>;
    rawMemoryIndex: {
        [segment: number]: string[]
    }
}

type BodyPartDescription = [BodyPartConstant, number, ResourceConstant?][];

interface SpawnRequest {
    memory: CreepMemory;
    body: BodyPartDescription;
    cost?: number;
    name: string;
}

type RefillableStructure = StructureTower | StructureExtension | StructureSpawn;

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

interface PointInRoom { x: number, y: number }
interface RoomDesign2 {
    version: number;
    rclDone: number;
    currentStage: number;
    detailSegment: number;
    center: PointInRoom;
    source: PointInRoom[];
    link: {
        source: PointInRoom[];
        center: PointInRoom;
        controller: PointInRoom;
    };
    centerSpawn: PointInRoom;
    mineralContainer: PointInRoom;
    lab: {
        input: PointInRoom[];
        output: PointInRoom[];
    }
}

interface RoomDesignDetail {
    version: number,
    stages: {
        rcl: number;
        list: {
            type: BuildableStructureConstant;
            x: number;
            y: number;
            name?: string;
        }[]
    }[],
    walls: PointInRoom[],
    ramparts: PointInRoom[],
    matrix: string[];
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
    design: RoomDesign2;
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
