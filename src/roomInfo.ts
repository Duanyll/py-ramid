import { designRoom } from "designer";
import { creepRolesForLevel, remoteHarvesterBody } from "creepCount";

let CallbackStore: { [type: string]: (room: RoomInfo, ...param: any) => void };
export function registerCallback(type: CallbackType, func: (room: RoomInfo, ...param: any) => void) {
    // console.log(`Registering callback ${type}`)
    if (!CallbackStore) CallbackStore = {};
    CallbackStore[type] = func;
}

export function runCallback(c: RoomCallback, room: RoomInfo) {
    console.log(`Running callback ${c.type}.`)
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
    // ramparts: StructureRampart[];
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

    centerSpawn: StructureSpawn;

    constructor(room: Room) {
        this.controller = room.controller as StructureController;
        room.find(FIND_MY_STRUCTURES).forEach((s) => {
            switch (s.structureType) {
                case STRUCTURE_EXTENSION:
                    this.extensions.push(s);
                    break;
                case STRUCTURE_EXTRACTOR:
                    this.extractor = s;
                    break;
                case STRUCTURE_FACTORY:
                    this.factory = s;
                    break;
                case STRUCTURE_LAB:
                    this.labs.push(s);
                    break;
                case STRUCTURE_LINK:
                    this.links.push(s);
                    break;
                case STRUCTURE_NUKER:
                    this.nuker = s;
                    break;
                case STRUCTURE_OBSERVER:
                    this.observer = s;
                    break;
                case STRUCTURE_POWER_SPAWN:
                    this.powerSpawn = s;
                    break;
                case STRUCTURE_SPAWN:
                    this.spawns.push(s);
                    break;
                case STRUCTURE_STORAGE:
                    this.storage = s;
                    break;
                case STRUCTURE_TERMINAL:
                    this.terminal = s;
                    break;
                case STRUCTURE_TOWER:
                    this.towers.push(s);
                    break;
            }
        });
    }
}

// 管理每个 room 的主要对象
export class RoomInfo {
    name: string;
    detail: Room;
    helperRoom: string;

    public get tasks() {
        return this.detail.memory.tasks;
    };
    public get moveQueue(): MoveRequest[] {
        return this.detail.memory.moveQueue;
    }
    public get spawnQueue(): SpawnRequest[] {
        return this.detail.memory.spawnQueue;
    }
    public get state(): RoomState {
        return this.detail.memory.state;
    }

    // 必须每 tick 重建
    creeps: { [role: string]: Creep[] };
    creepForRole: { [roleId: string]: Creep };

    creepRoleDefs: {
        [roleId: string]: {
            role: CreepRole,
            body: BodyPartDescription,
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

    public get stats() {
        return this.detail.memory.stats;
    }

    public get structRcl() {
        return this.design.stages[Math.max(this.design.currentStage - 1, 0)].rcl;
    }

    public constructor(roomName: string) {
        this.name = roomName;
        this.detail = Game.rooms[this.name];
        this.initMemory();
    }

    initMemory() {
        this.detail.memory = this.detail.memory || {} as RoomMemory;
        let m = this.detail.memory;
        m.design = m.design || designRoom(this.detail);
        m.tasks = m.tasks || {};
        m.moveQueue = m.moveQueue || [];
        m.spawnQueue = m.spawnQueue || [];
        m.remoteSources = m.remoteSources || [];
        if (!m.state) {
            m.state = {
                status: "normal",
                refillState: {},
                wallHits: 0,
                roleSpawnStatus: {},
                roadToRepair: []
            }
            // checkRefillState(this);
        }
        this.helperRoom = this.detail.memory.helperRoom;
    }

    public reload() {
        this.detail = Game.rooms[this.name];
        this._structures = new RoomStructures(this.detail);
        this._structures.centerLink = this.getLink(this.design.links.centerLink);
        this._structures.controllerLink = this.getLink(this.design.links.controllerLink);
        this._structures.sourceLink = this.design.links.sourceLink.map(p => this.getLink(p));
        this._structures.sources = this.design.sources.map(p => this.detail.lookForAt(LOOK_SOURCES, p[0], p[1])[0]);
        this._structures.centerSpawn = this.detail.lookForAt(LOOK_STRUCTURES, this.design.centerSpawn[0], this.design.centerSpawn[1])
            .find(s => s.structureType == STRUCTURE_SPAWN) as StructureSpawn;
        this._structuresLoadTime = Game.time;
    }

    public tickTasks(): void {
        _.forIn(this.tasks, (next, name) => {
            if (next == Game.time) runCallback({ type: name as CallbackType }, this);
        })
    }

    public delay(type: CallbackType, time: number) {
        if (!this.tasks[type] || this.tasks[type] <= Game.time) {
            this.tasks[type] = Game.time + time;
        }
        else {
            this.tasks[type] = _.min([Game.time + time, this.tasks[type]]);
        }
    }

    public updateCreepCount() {
        this.creepRoleDefs = creepRolesForLevel[this.structRcl];
        if (remoteHarvesterBody[this.structRcl]) {
            for (const i in this.detail.memory.remoteSources) {
                this.creepRoleDefs[`rharv${i}`] = {
                    role: "remoteHarvest",
                    body: remoteHarvesterBody[this.structRcl]
                }
            }
        }
    }
}

export let managedRooms: { [name: string]: RoomInfo } = {}
