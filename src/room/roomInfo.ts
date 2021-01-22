import { classicDesignRoom, upgradeDesign } from "room/designer/classic";
import { globalDelay } from "utils";
import Logger from "utils";
import cfg from "config";

let roomRoutineStore: { [type in RoomRoutine]?: (room: RoomInfo, ...param: any) => void } = {};
export function registerRoomRoutine(type: RoomRoutine, func: (room: RoomInfo, ...param: any) => void) {
    // console.log(`Registering callback ${type}`)
    roomRoutineStore[type] = func;
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

// 结构化存储房间内缓存
export class RoomInfo {
    name: string;
    detail: Room;
    helperRoom: string;

    matrixCache: CostMatrix;

    public get tasks() {
        return this.detail.memory.tasks;
    };

    public get spawnQueue(): SpawnRequest[] {
        return this.detail.memory.spawnQueue;
    }

    refillTargets: { [id: string]: number } = {};
    roadToRepair: string[] = [];
    wallBuildQueue: { id: string, hitsRemain: number }[] = [];
    wallHits: number;
    moveRequests: {
        in: {
            [id: string]: {
                type: ResourceConstant,
                amount: number
            }
        },
        out: {
            [id: string]: {
                type?: ResourceConstant,
                amount?: number
            }
        }
    } = { in: {}, out: {} }
    tombstones: Tombstone[];

    labRunning: boolean;

    public get state(): RoomState {
        return this.detail.memory.state;
    }

    // 必须每 tick 重建
    creeps: Creep[];
    creepForRole: { [roleId: string]: Creep[] };

    creepRoleDefs: {
        [roleId: string]: {
            role: CreepRole,
            body: BodyPartDescription,
            target?: string
        };
    }

    private _structures?: RoomStructures;
    private _structuresLoadTime = 0;
    private getLink(pos: PointInRoom) {
        return this.detail.lookForAt(LOOK_STRUCTURES, pos.x, pos.y)
            .filter(s => s.structureType == STRUCTURE_LINK)[0] as StructureLink;
    }
    public get structures() {
        if (!this._structures) this.loadStructures();
        return this._structures;
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

    public constructor(roomName: string) {
        this.name = roomName;
        this.detail = Game.rooms[this.name];
        this.initMemory();
        this.detail.find(FIND_HOSTILE_STRUCTURES).forEach(s => s.destroy());

        this.loadStructures();

        this.delay("fullCheckConstruction", 0);
        this.delay("checkRoads", 0);
        this.delay("updateCreepCount", 0);
        this.delay("runLabs", 1);
        this.delay("fetchLabWork", 1);
        this.delay("fetchWall", 1);
    }

    loadStructures() {
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
        this.tombstones.forEach(t => {
            if (t.creep.my && _.sum(_.values(t.store)) - (t.store.energy || 0)) {
                this.moveRequests.out[t.id] = {};
            }
        })
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
                labMode: "disabled",
                labContent: [],
                mineralToTransport: 0
            },
            resource: {
                reserve: {},
                import: {},
                export: {},
                lock: {},
                produce: {}
            }
        } as RoomMemory)
        this.helperRoom = this.detail.memory.helperRoom;
    }

    public tickTasks(): void {
        _.forIn(this.tasks, (next, name) => {
            if (next == Game.time) roomRoutineStore[name as RoomRoutine](this);
        })
    }

    public delay(type: RoomRoutine, time?: number) {
        time ??= cfg.ROOM_ROUTINE_DELAY[type];
        if (!this.tasks[type] || this.tasks[type] <= Game.time) {
            this.tasks[type] = Game.time + time;
        } else {
            this.tasks[type] = _.min([Game.time + time, this.tasks[type]]);
        }
    }

    public requestResource(type: ResourceConstant, amount: number, dontLock?: boolean) {
        if (!dontLock) {
            this.resource.lock[type] = (this.resource.lock[type] + amount) || amount;
        }
        if (!this.resource.produce[type]) {
            let required = (this.resource.reserve[type] || 0) + (this.resource.lock[type] || 0)
                - this.countStore(type as ResourceConstant) - (this.resource.import[type] || 0);
            if (required > 0) {
                this.resource.import[type] = required;
                globalDelay("runTerminal", 1);
            }
        }
    }

    public countStore(type: ResourceConstant): number {
        return this._store[type] || 0;
    }

    public logStore(type: ResourceConstant, amount: number, unlock?: boolean) {
        this._store[type] ||= 0;
        if (this._store[type] + amount < 0) {
            Logger.error(`Invalid room store registeration: ${this.name}, ${type}, ${amount}`);
        } else {
            this._store[type] += amount;
            global.store.current[type] ||= 0;
            global.store.current[type] += amount;
        }
        if (unlock) {
            if (this.resource.lock[type] + amount < 0) {
                Logger.error(`Invalid room resource unlock: ${this.name}, ${type}, ${amount}`);
            } else {
                this.resource.lock[type] += amount;
            }
        }
    }

    public get energy() {
        return this.structures.storage.store.energy;
    }

    _store: { [type in ResourceConstant]?: number } = {};
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

global.logMoveRequest = (roomName: string) => {
    const room = myRooms[roomName];
    _.forIn(room.moveRequests, (info, id) => {
        Logger.report(`${id}: ${JSON.stringify(info)}`);
    })
}
