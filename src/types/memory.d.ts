interface CreepMemory {
    role: CreepRole;
    target?: string;
    roleId?: string;
    room?: string;
    group?: string;
    boost?: MineralBoostConstant[];
}

interface PowerCreepMemory {
    room: string;
    state: "moveToRoom" | "usePower" | "pickOps" | "putOps" | "renew" | "idle" | "enablePower";
    target: string;
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
        product: ResourceConstant,
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
        },
        autoBuy: {
            [type in ResourceConstant]?: {
                maxPrice: number,
                minAmount: number,
                orders?: string[]
                updateTime: number
            }
        }
    },
    playerWhiteList: Record<string, boolean>;
    rawMemoryIndex: {
        [segment: number]: string[]
    },
    version: number;
}

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
    refillFailTime?: number,
    lab: {
        boost: ResourceConstant[],
        product?: ResourceConstant,
        remain?: number,
        boostExpires?: number
    }
    chargeNuker: boolean,
    autoProcessPower: boolean,
    disableTower?: boolean,
    mineralToTransport?: number;
}

interface RoomDesign {
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
