import { designRoom, upgradeDesign } from "designer";
import Logger from "utils/Logger";

let CallbackStore: { [type: string]: (room: RoomInfo, ...param: any) => void };
export function registerCallback(type: CallbackType, func: (room: RoomInfo, ...param: any) => void) {
    // console.log(`Registering callback ${type}`)
    if (!CallbackStore) CallbackStore = {};
    CallbackStore[type] = func;
}

export function runCallback(c: RoomCallback, room: RoomInfo) {
    // console.log(`Running callback ${c.type}.`)
    if (c.param) {
        CallbackStore[c.type](room, ...c.param);
    } else {
        CallbackStore[c.type](room);
    }
}

class RoomStructures {
    // containers: StructureContainer[] = [];
    controller: StructureController;
    extensions: StructureExtension[] = [];
    extractor: StructureExtractor;
    factory: StructureFactory;
    labs: StructureLab[] = [];
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
    private getLink(pos: [number, number]) {
        return this.detail.lookForAt(LOOK_STRUCTURES, pos[0], pos[1])
            .filter(s => s.structureType == STRUCTURE_LINK)[0] as StructureLink;
    }
    public get structures() {
        return this._structures;
    }

    public get design() {
        return this.detail.memory.design;
    }

    public get resource() {
        return this.detail.memory.resource;
    }

    public get structRcl() {
        return this.design.stages[Math.max(this.design.currentStage - 1, 0)].rcl;
    }

    public constructor(roomName: string) {
        this.name = roomName;
        this.detail = Game.rooms[this.name];
        this.initMemory();
        this.detail.find(FIND_HOSTILE_STRUCTURES).forEach(s => s.destroy());

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
        strobj.centerLink = this.getLink(this.design.links.centerLink);
        strobj.controllerLink = this.getLink(this.design.links.controllerLink);
        strobj.sourceLink = this.design.links.sourceLink.map(p => this.getLink(p));
        strobj.sources = this.design.sources.map(p => this.detail.lookForAt(LOOK_SOURCES, p[0], p[1])[0]);
        strobj.labs = _.compact(this.design.labs.map(
            p => this.detail.lookForAt(LOOK_STRUCTURES, p[0], p[1])
                .find(s => s.structureType == "lab")) as StructureLab[]);
        strobj.centerSpawn = this.detail.lookForAt(LOOK_STRUCTURES, this.design.centerSpawn[0], this.design.centerSpawn[1])
            .find(s => s.structureType == STRUCTURE_SPAWN) as StructureSpawn;
        strobj.mineral = this.detail.find(FIND_MINERALS)[0];
        strobj.mineralContainer = this.detail.lookForAt(LOOK_STRUCTURES, this.design.mineralContainer[0], this.design.mineralContainer[1])
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
        m.design = m.design || designRoom(this.detail);
        upgradeDesign(this.detail, m.design);
        m.tasks = m.tasks || {};
        m.spawnQueue = m.spawnQueue || [];
        m.state = m.state || {} as RoomState;
        _.defaults(m.state, {
            status: "normal",
            energyState: "store",
            energyMode: "upgrade",
            labMode: "disabled",
            labContent: []
        } as RoomState);
        m.resource = m.resource || {} as RoomResource;
        _.defaults(m.resource, {
            reserve: {},
            import: {},
            export: {},
            lock: {},
            produce: {}
        } as RoomResource);
        this.helperRoom = this.detail.memory.helperRoom;
    }

    public tickTasks(): void {
        _.forIn(this.tasks, (next, name) => {
            if (next == Game.time) runCallback({ type: name as CallbackType }, this);
        })
    }

    public delay(type: CallbackType, time: number) {
        if (!this.tasks[type] || this.tasks[type] <= Game.time) {
            this.tasks[type] = Game.time + time;
        } else {
            this.tasks[type] = _.min([Game.time + time, this.tasks[type]]);
        }
    }

    public requestResource(type: ResourceConstant, amount: number) {
        this.resource.lock[type] = (this.resource.lock[type] + amount) || amount;
        if (!this.resource.produce[type]) {
            let required = (this.resource.reserve[type] ?? 0) + (this.resource.lock[type] ?? 0)
                - this.countResource(type as ResourceConstant);
            if (required > 0) this.resource.import[type] = required;
        }
    }

    public countResource(type: ResourceConstant): number {
        return _.sumBy([this.structures.terminal, this.structures.storage, ...(this.creepForRole["center"] || [])],
            s => s.store.getUsedCapacity(type));
    }
}

export let myRooms: { [name: string]: RoomInfo } = {}
global.myRooms = myRooms;

export function loadRooms() {
    for (const name in Game.rooms) {
        const room = Game.rooms[name];
        if (room.controller?.my) {
            myRooms[name] = new RoomInfo(name);
        }
    }
}

global.logMoveRequest = (roomName: string) => {
    const room = myRooms[roomName];
    _.forIn(room.moveRequests, (info, id) => {
        Logger.report(`${id}: ${JSON.stringify(info)}`);
    })
}
