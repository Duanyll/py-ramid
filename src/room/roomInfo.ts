import { classicDesignRoom, upgradeDesign } from "room/designer/classic";
import { getCreepCost as calcCreepCost, globalDelay } from "utils";
import Logger from "utils";
import cfg from "config";
import { roleBodies } from "creep/body";
import { StoreRegister } from "utils/storeRegister";
import { CENTER_STRUCTURES, LAB_RECIPE } from "utils/constants";
import { registerCommand } from "utils/console";

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

    public get structRcl() {
        return this.design.rclDone || 1;
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

        _.defaultsDeep(m, {
            tasks: {},
            spawnQueue: [],
            state: {
                status: "normal",
                link: {
                    targets: ["center", "controller"],
                    centerMode: "recieve"
                },
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
                powerToProcess: 0
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

    getReserve(res: ResourceConstant): number;
    getReserve(): Partial<Record<ResourceConstant, number>>;
    getReserve(res?: ResourceConstant) {
        if (res) {
            return cfg.ROOM_RESERVE[res] ?? 0;
        } else {
            return cfg.ROOM_RESERVE;
        }
    }

    getExport(res: ResourceConstant): number {
        if (res == this.structures.mineral.mineralType) return cfg.TERMINAL_EXPORT_MINERAL;
        if (res == RESOURCE_ENERGY) return cfg.ENERGY.TERMINAL;
        return cfg.TERMINAL_EXPORT_DEFAULT;
    }

    whereToPut(res: ResourceConstant) {
        const storage = this.structures.storage;
        const terminal = this.structures.terminal;
        if (!terminal) return storage;
        if (res != RESOURCE_ENERGY) {
            const reserveAmount = this.getReserve(res);
            if (storage.store[res] < reserveAmount) return storage;
            const exportAmount = this.getExport(res);
            if (terminal.store[res] < exportAmount) return terminal;
            return storage;
        } else {
            if (storage.store.energy < cfg.ENERGY.LOW) return storage;
            if (terminal.store.energy < cfg.ENERGY.TERMINAL) return terminal;
            return storage;
        }
    }

    whereToGet(res: ResourceConstant) {
        const storage = this.structures.storage;
        const terminal = this.structures.terminal;
        if (res == RESOURCE_ENERGY) return storage;
        if (!terminal || terminal.store[res] <= 0) return storage.store[res] ? storage : undefined;
        const reserveAmount = this.getReserve(res);
        if (storage.store[res] > reserveAmount) {
            return storage;
        } else {
            return terminal;
        }
    }

    private _storeBook: StoreRegister;
    private _storeBookUpd: number;
    private createStoreBook() {
        this._storeBook = new StoreRegister();

        // reserve
        _.forIn(this.getReserve(), (amount, res) => this._storeBook.add(res as ResourceConstant, amount));

        // lab
        const labTask = (res: ResourceConstant, amount: number) => {
            LAB_RECIPE[res].forEach(r => this._storeBook.add(r, amount));
            this._storeBook.add(res, -amount);
        }
        if (this.state.lab.remain) {
            labTask(this.state.lab.product, this.state.lab.remain);
        }
        this.state.lab.queue.forEach(i => labTask(i.product, i.amount));

        // boost
        this.state.lab.boost.forEach(i => this._storeBook.add(i.type, i.amount));

        // powerSpawn
        this._storeBook.add("power", this.state.powerToProcess);

        // factory
        const factoryTask = (res: ResourceConstant, remain: number) => {
            const recipe = COMMODITIES[res as CommodityConstant];
            _.forIn(recipe.components, (amount, r) => {
                this._storeBook.add(r as ResourceConstant, amount * _.ceil(remain / recipe.amount));
            })
            this._storeBook.add(res, remain);
        }
        if (this.state.factory.remain) {
            factoryTask(this.state.factory.product, this.state.factory.remain);
        }

        // boost upgrade
        if (this.state.boostUpgrade) {
            this._storeBook.add("XGH2O", 50_000);
        }
    }
    public get storeBook() {
        if (!this._storeBook || this._storeBookUpd != Game.time) {
            this._storeBookUpd = Game.time;
            this.createStoreBook();
        }
        return this._storeBook;
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
        name = `${this.name}-${roleId || role}-${Game.time % 10000}`,
        memory,
    }: { body?: BodyPartDescription | Record<number, BodyPartDescription>, roleId?: string, name?: string, group?: string, memory?: Partial<CreepMemory>, room?: string }) {
        if (!_.isArray(body)) body = body[this.structRcl];
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
}

export let myRooms: { [name: string]: RoomInfo } = {}
global.myRooms = global.rooms = myRooms;
Object.defineProperty(Room.prototype, 'info', {
    get: function (this: Room) {
        return myRooms[this.name];
    },
    enumerable: false,
    configurable: true
})

registerCommand('logRoomRoutine', 'log room routine info to console.', [
    { name: "room", type: "myRoom" }
], (room: string) => {
    _.forIn(myRooms[room].tasks, (time, name) => {
        Logger.report(`${name}: ${time} (${time > Game.time ? `${time - Game.time} ticks later` : `${Game.time - time} ticks before`})`)
    })
})
