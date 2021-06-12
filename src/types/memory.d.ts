/* -------------------------------------------------------------------------- */
/*                                   creeps                                   */
/* -------------------------------------------------------------------------- */

interface CreepMemory {
    role: CreepRoleType;
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
    role: undefined;
}

/* -------------------------------------------------------------------------- */
/*                                global memory                               */
/* -------------------------------------------------------------------------- */

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
    }[][],
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
                updateTime: number
            }
        },
        autoBuy: {
            [type in ResourceConstant]?: {
                maxPrice: number,
                minAmount: number,
                updateTime: number
            }
        },
        buyOrders: {
            type: ResourceConstant,
            minPrice: number,
            maxPrice: number,
            addPrice: number,
            buffer: number,
            perOrder: number,
            room: string,
            maxStore: number,
            remain?: number
        }[],
        orderDealTime: Record<string, number>;
    },
    playerWhiteList: Record<string, boolean>;
    rawMemoryIndex: {
        [segment: number]: string[]
    },
    version: number;
    config: any;
}

/* -------------------------------------------------------------------------- */
/*                                 room memory                                */
/* -------------------------------------------------------------------------- */

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
    },
    link: {
        targets: ("controller" | "center")[],
        centerMode: "recieve" | "send"
    }
    enableMining: boolean;
    refillFailTime?: number,
    lab: {
        boost: { type: ResourceConstant, amount: number }[],
        boostExpires?: number,
        product?: ResourceConstant,
        remain?: number,
        total?: number,
        allowPower?: boolean,
        queue: {
            product: ResourceConstant,
            amount: number
        }[],
    },
    factory: {
        level: number,
        product?: ResourceConstant,
        remain?: number,
        needUnlock?: boolean;
    }
    chargeNuker: boolean,
    autoProcessPower: boolean,
    powerToProcess: number,
    // disableTower?: boolean,
    boostUpgrade: boolean
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
    /**
     * Used for preview design.
     * First dimension for y coord, second for x.
     */
    matrix: string[];
}

interface RoomMemory {
    tasks: {
        [name in RoomRoutineType]?: number;
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
    sign?: string
}
