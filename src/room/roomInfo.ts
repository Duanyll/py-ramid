import { classicDesignRoom, upgradeDesign } from "room/designer/classic";
import { getCreepCost as calcCreepCost, globalDelay } from "utils";
import Logger from "utils";
import cfg from "config";
import { roleBodies } from "creep/body";
import { StoreRegister } from "utils/storeRegister";
import { CENTER_STRUCTURES } from "utils/constants";

export interface RoomRoutineConfig {
    id: RoomRoutineType;
    /**
     * 要求先行 init 的 routine
     */
    dependsOn?: RoomRoutineType[];
    /**
     * 在房间初始化后，载入 memory 和 store 后调用
     * @param room
     */
    init?(room: RoomInfo): void;
    /**
     * 由 delay 方法调用
     * @param room
     */
    invoke?(room: RoomInfo): void;
    /**
     * 两次 invoke 的最大时间间隔,
     * `cfg.ROOM_ROUTINE_DELAY` 是默认值
     */
    defaultDelay?: number;
}
let roomRoutineStore: { [type in RoomRoutineType]?: RoomRoutineConfig } = {};
export function registerRoomRoutine(config: RoomRoutineConfig) {
    config.defaultDelay = cfg.ROOM_ROUTINE_DELAY[config.id];
    roomRoutineStore[config.id] = config;
}

class RoomStructures {
    // containers: StructureContainer[] = [];
    controller: StructureController;
    extensions: StructureExtension[] = [];
    extractor: StructureExtractor;
    factory: StructureFactory;
    labs: { input: StructureLab[], output: StructureLab[] };
    links: StructureLink[] = [];
    nuker: StructureNuker;
    observer: StructureObserver;
    powerSpawn: StructurePowerSpawn;
    ramparts: StructureRampart[] = [];
    // roads: StructureRoad[] = [];
    spawns: StructureSpawn[] = [];
    storage: StructureStorage;
    terminal: StructureTerminal;
    towers: StructureTower[] = [];
    // walls: StructureWall[];

    centerLink: StructureLink;
    sourceLink: StructureLink[];
    controllerLink: StructureLink;

    sources: Source[];
    mineral: Mineral;
    mineralContainer: StructureContainer;

    centerSpawn: StructureSpawn;
}

export class RoomInfo {

    /* -------------------------------------------------------------------------- */
    /*                                 basic info                                 */
    /* -------------------------------------------------------------------------- */

    name: string;
    detail: Room;
    helperRoom: string;

    matrixCache: CostMatrix;

    public get tasks() {
        return this.detail.memory.tasks;
    };

    public get spawnQueue(): SpawnRequest[] {
        return this.detail.memory.spawnQueue;
    };

    public get state(): RoomState {
        return this.detail.memory.state;
    }

    public get design() {
        return this.detail.memory.design;
    }

    public get resource() {
        return this.detail.memory.resource;
    }

    public get structRcl() {
        return this.design.rclDone;
    }

    /* -------------------------------------------------------------------------- */
    /*                                    stats                                   */
    /* -------------------------------------------------------------------------- */

    labRunning: boolean;
    wallHits: number;

    /* -------------------------------------------------------------------------- */
    /*                                 task cache                                 */
    /* -------------------------------------------------------------------------- */

    refillTargets: Record<string, number> = {};
    roadToRepair: string[] = [];
    wallBuildRequest: Map<string, number> = new Map();


    /* -------------------------------------------------------------------------- */
    /*                            structure and creeps                            */
    /* -------------------------------------------------------------------------- */

    creeps: Creep[];
    /** 快速查找某个职位的 creep */
    creepForRole: { [roleId: string]: Creep[] };

    /** 需要自动生成的 creep 配置 */
    creepRoleDefs: {
        [roleId: string]: {
            role: CreepRole,
            body: BodyPartDescription,
            target?: string
        };
    }
    tombstones: Tombstone[];

    private _structures?: RoomStructures;
    private _structuresLoadTime = 0;
    private getLink(pos: PointInRoom) {
        return this.detail.lookForAt(LOOK_STRUCTURES, pos.x, pos.y)
            .filter(s => s.structureType == STRUCTURE_LINK)[0] as StructureLink;
    }
    public get structures() {
        if (!this._structures || this._structuresLoadTime != Game.time) {
            this._structuresLoadTime = Game.time;
            this.loadStructures();
        }
        return this._structures;
    }

    private loadStructures() {
        this._structures = new RoomStructures();
        this.detail = Game.rooms[this.name];
        let strobj = this._structures;
        strobj.controller = this.detail.controller as StructureController;
        this.detail.find(FIND_MY_STRUCTURES).forEach((s) => {
            if (!s.isActive) return;
            switch (s.structureType) {
                case STRUCTURE_EXTENSION:
                    strobj.extensions.push(s);
                    break;
                case STRUCTURE_EXTRACTOR:
                    strobj.extractor = s;
                    break;
                case STRUCTURE_FACTORY:
                    strobj.factory = s;
                    break;
                case STRUCTURE_LINK:
                    strobj.links.push(s);
                    break;
                case STRUCTURE_NUKER:
                    strobj.nuker = s;
                    break;
                case STRUCTURE_OBSERVER:
                    strobj.observer = s;
                    break;
                case STRUCTURE_POWER_SPAWN:
                    strobj.powerSpawn = s;
                    break;
                case STRUCTURE_SPAWN:
                    strobj.spawns.push(s);
                    break;
                case STRUCTURE_STORAGE:
                    strobj.storage = s;
                    break;
                case STRUCTURE_TERMINAL:
                    strobj.terminal = s;
                    break;
                case STRUCTURE_TOWER:
                    strobj.towers.push(s);
                    break;
                case STRUCTURE_RAMPART:
                    strobj.ramparts.push(s);
                    break;
            }
        });
        strobj.centerLink = this.getLink(this.design.link.center);
        strobj.controllerLink = this.getLink(this.design.link.controller);
        strobj.sourceLink = this.design.link.source.map(p => this.getLink(p));
        strobj.sources = this.design.source.map(p => this.detail.lookForAt(LOOK_SOURCES, p.x, p.y)[0]);
        strobj.labs = {
            input: _.compact(this.design.lab.input.map(
                p => this.detail.lookForAt(LOOK_STRUCTURES, p.x, p.y)
                    .find(s => s.structureType == "lab")) as StructureLab[]),
            output: _.compact(this.design.lab.output.map(
                p => this.detail.lookForAt(LOOK_STRUCTURES, p.x, p.y)
                    .find(s => s.structureType == "lab")) as StructureLab[])
        }
        strobj.centerSpawn = this.detail.lookForAt(LOOK_STRUCTURES, this.design.centerSpawn.x, this.design.centerSpawn.y)
            .find(s => s.structureType == STRUCTURE_SPAWN) as StructureSpawn;
        strobj.mineral = this.detail.find(FIND_MINERALS)[0];
        strobj.mineralContainer = this.detail.lookForAt(LOOK_STRUCTURES, this.design.mineralContainer.x, this.design.mineralContainer.y)
            .find(s => s.structureType == STRUCTURE_CONTAINER) as StructureContainer;

        this.tombstones = this.detail.find(FIND_TOMBSTONES);
    }

    /* -------------------------------------------------------------------------- */
    /*                                 initialize                                 */
    /* -------------------------------------------------------------------------- */

    public constructor(roomName: string) {
        this.name = roomName;
        this.detail = Game.rooms[this.name];
        this.initMemory();
        this.detail.find(FIND_HOSTILE_STRUCTURES).forEach(s => s.destroy());

        this.initTasks();
    }

    initMemory() {
        this.detail.memory = this.detail.memory || {} as RoomMemory;
        let m = this.detail.memory;
        // TODO: 直接生成 RoomDesign2
        // m.design = m.design || classicDesignRoom(this.detail);
        // upgradeDesign(this.detail, m.design);

        _.defaultsDeep(m, {
            tasks: {},
            spawnQueue: [],
            state: {
                status: "normal",
                energy: {
                    storeMode: true,
                    activeCount: 0,
                    usage: {},
                    primary: ["builder"],
                    primaryUpdateTime: Game.time
                },
                lab: {
                    boost: [],
                    remain: 0,
                    queue: []
                },
                factory: {
                    level: 0,
                },
            },
            resource: {
                reserve: {},
                export: {},
            }
        } as RoomMemory)
        this.helperRoom = this.detail.memory.helperRoom;
    }

    /* -------------------------------------------------------------------------- */
    /*                               room scheduler                               */
    /* -------------------------------------------------------------------------- */

    private initTasks() {
        let vis = {} as Record<RoomRoutineType, boolean>;
        const doInit = (routine: RoomRoutineType) => {
            if (vis[routine]) return;
            vis[routine] = true;
            let config = roomRoutineStore[routine];
            config.dependsOn?.forEach(doInit);
            config.init?.(this);
            if (config.defaultDelay) this.delay(routine, config.defaultDelay);
        }
        (_.keys(roomRoutineStore) as RoomRoutineType[]).forEach(doInit);
    }

    public tickTasks(): void {
        _.forIn(this.tasks, (next, name) => {
            if (next == Game.time) {
                let config = roomRoutineStore[name as RoomRoutineType];
                roomRoutineStore[name as RoomRoutineType].invoke?.(this);
                if (config.defaultDelay) this.delay(config.id, config.defaultDelay);
            }
        })
    }

    public delay(type: RoomRoutineType, time?: number) {
        time ??= roomRoutineStore[type].defaultDelay;
        if (!this.tasks[type] || this.tasks[type] <= Game.time) {
            this.tasks[type] = Game.time + time;
        } else {
            this.tasks[type] = _.min([Game.time + time, this.tasks[type]]);
        }
    }

    /* -------------------------------------------------------------------------- */
    /*                              resource manager                              */
    /* -------------------------------------------------------------------------- */

    storeSection: typeof global.store; // 防止循环引用
    storeCurrent: StoreRegister;
    storeBook: StoreRegister;
    incomingProduct: StoreRegister;

    /**
     * 预定一定量资源，若房间内不够则尝试从各处调配
     * @param res 资源种类
     * @param amount 要增加预定的量
     */
    public bookResource(res: ResourceConstant, amount: number) {
        this.storeBook.add(res, amount);
    }

    /**
     * 登记消耗的资源
     * @param res 资源种类
     * @param amount 正数，当前操作一次消耗的量
     * @param booked 是否预定过本次消耗的资源（其实没有预定也不需要登记消耗）
     */
    public logConsume(res: ResourceConstant, amount: number, booked = true) {
        this.storeCurrent.add(res, -amount);
        if (booked) this.storeBook.add(res, -amount);
    }

    /**
     * 登记产出的资源
     * @param res 资源种类
     * @param amount 正数，产出资源的量
     */
    public logProduce(res: ResourceConstant, amount: number) {
        this.storeCurrent.add(res, amount);
        this.incomingProduct.add(res, -amount);
    }

    public get energy() {
        return this.structures.storage.store.energy;
    }

    /* -------------------------------------------------------------------------- */
    /*                                    spawn                                   */
    /* -------------------------------------------------------------------------- */

    public requestSpawn(role: CreepRole, {
        body = roleBodies[role],
        roleId,
        group,
        room,
        name = `${this.name}-${roleId || role}-${Game.time}`,
        memory,
    }: { body?: BodyPartDescription, roleId?: string, name?: string, group?: string, memory?: Partial<CreepMemory>, room?: string }) {
        const cost = calcCreepCost(body);
        if (Game.creeps[name]) {
            Logger.error(`${this.name}: Cannot spawn creep ${name}: Existed.`);
            return false;
        }
        if (cost > this.detail.energyCapacityAvailable) {
            Logger.error(`${this.name}: Cannot spawn creep ${name}: Too large.`);
            return false;
        }
        let boostInfo = [] as MineralBoostConstant[];
        body.forEach(part => {
            if (part[2]) {
                boostInfo.push(part[2]);
                this.bookResource(part[2], LAB_BOOST_MINERAL * part[1]);
                const x = _.find(this.state.lab.boost, { type: part[2] });
                if (x) {
                    x.amount += LAB_BOOST_MINERAL * part[1];
                } else {
                    this.state.lab.boost.push({ type: part[2], amount: LAB_BOOST_MINERAL * part[1] });
                }
            }
        })
        let fullMemory: CreepMemory = _.defaults(memory, { role, roleId, group, room, boost: boostInfo });
        if (boostInfo.length) {
            this.state.lab.boostExpires = _.max([this.state.lab.boostExpires, Game.time + 500]);
            this.delay("runBoost", 1);
        }
        this.spawnQueue.push({
            name, body, memory: fullMemory, cost
        });
        return true;
    }

    /* -------------------------------------------------------------------------- */
    /*                                    power                                   */
    /* -------------------------------------------------------------------------- */

    powerRequests: Record<string, { type: PowerConstant, level?: number }> = {};
    powerAvaliable: Partial<Record<PowerConstant, number[]>> = {};
    registerPowerCreep(pc: PowerCreep) {
        _.forIn(pc.powers, (power, id) => {
            const powerId = Number(id) as PowerConstant;
            if (powerId in this.powerAvaliable) {
                this.powerAvaliable[powerId].push(power.level);
            } else {
                this.powerAvaliable[powerId] = [power.level];
            }
        });
    }
    requestPower(s: RoomObject & { id: string }, powerId: PowerConstant, level?: number) {
        if (_.find(s.effects, e => e.effect == powerId && e.ticksRemaining >= 100)) return;
        if (this.powerAvaliable[powerId]) {
            if (level !== undefined && _.find(this.powerAvaliable[powerId], i => i == level) === undefined) return;
            this.powerRequests[s.id] = { type: powerId, level };
        }
    }

    factoryRequests: Partial<Record<ResourceConstant, number>> = {};
}

export let myRooms: { [name: string]: RoomInfo } = {}
global.myRooms = myRooms;
Object.defineProperty(Room.prototype, 'info', {
    get: function (this: Room) {
        return myRooms[this.name];
    },
    enumerable: false,
    configurable: true
})
