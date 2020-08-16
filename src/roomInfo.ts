import { getRoomDesign } from "designer";
import { tickCarrier } from "roleCarrier";

var CallbackStore: { [type: string]: (room: RoomInfo, ...param: any) => void } = {}
export function registerCallback(type: string, func: (room: RoomInfo, ...param: any) => void) {
    CallbackStore[type] = func;
}

export function runCallback(c: RoomCallback, room: RoomInfo) {
    CallbackStore[c.type](room, ...c.param);
}

// 自己注意结构存不存在，不用 TS 的 undefined 提示
class RoomStructures {
    // containers: StructureContainer[] = [];
    controller: StructureController;
    extensions: StructureExtension[] = [];
    extractor!: StructureExtractor;
    factory!: StructureFactory;
    labs: StructureLab[] = [];
    links: StructureLink[] = [];
    nuker!: StructureNuker;
    observer!: StructureObserver;
    powerSpawn!: StructurePowerSpawn;
    // ramparts: StructureRampart[];
    // roads: StructureRoad[] = [];
    spawns: StructureSpawn[] = [];
    storage!: StructureStorage;
    terminal!: StructureTerminal;
    towers: StructureTower[] = [];
    // walls: StructureWall[];

    centerLink!: StructureLink;

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
                    if (s.pos.inRangeTo(this.controller, 5)) {
                        this.centerLink = s;
                    }
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
    // 不保存
    eventTimer: { [time: number]: RoomCallback[] } = {};
    name: string;
    detail: Room;

    moveQueue: MoveRequest[] = [];

    // 只有非日常种田需求产生的 Creep 才需要通过 spawnQueue 维护, 种田 creep 直接按数量维护即可
    spawnQueue: SpawnRequest[] = [];
    state!: RoomState;

    private _creeps: { [role: string]: Creep[] } = {};
    private _creepsLoadTime = 0;
    public get creeps() {
        if (!this._creeps || this._creepsLoadTime < Game.time) {
            this._creeps = {};
            this.detail.find(FIND_MY_CREEPS).forEach((creep) => {
                if (!this._creeps[creep.memory.role]) this._creeps[creep.memory.role] = [];
                this._creeps[creep.memory.role].push(creep);
            });
            this._creepsLoadTime = Game.time;
        }
        return this._creeps;
    }
    private _structures?: RoomStructures;
    private _structuresLoadTime = 0;
    public get structures() {
        if (!this._structures || this._structuresLoadTime < Game.time) {
            this._structures = new RoomStructures(this.detail);
            this._structuresLoadTime = Game.time;
        }
        return this._structures;
    }
    public get design() {
        if (!this.detail.memory.design) {
            this.detail.memory.design = getRoomDesign(this.detail);
        }
        return this.detail.memory.design;
    }

    public constructor(roomName: string) {
        this.name = roomName;
        this.detail = Game.rooms[this.name];
        if (this.detail.memory) {
            this.load();
        } else {
            this.detail.memory = {} as RoomMemory;
            this.state = this.detail.memory.state = {
                status: "normal",
                refillState: {},
            };
        }
    }

    public tick(): void {
        if (this.eventTimer[Game.time]) {
            this.eventTimer[Game.time].forEach(c => runCallback(c, this));
            delete this.eventTimer[Game.time];
        }

        tickCarrier(this);

        this.save();
    }

    public scheduleEvent(time: number, callback: RoomCallback) {
        if (time <= Game.time) {
            console.log(`Warning: Trying to schedule event in the past.`);
        }
        if (this.eventTimer[time] == undefined) {
            this.eventTimer[time] = [];
        }
        this.eventTimer[time].push(callback);
    }

    public save(): void {
        let m = this.detail.memory;
        m.eventTimer = this.eventTimer;
        m.moveQueue = this.moveQueue;
        m.spawnQueue = this.spawnQueue;
        m.state = this.state;
    }

    public load(): void {
        const m = this.detail.memory;
        this.eventTimer = m.eventTimer;
        this.moveQueue = m.moveQueue;
        this.spawnQueue = m.spawnQueue;
        this.state = m.state;
    }
}

function loadRefillState(room: RoomInfo) {
    function f(s: RefillableStructure) {
        if (s.store.getFreeCapacity(RESOURCE_ENERGY) == 0) {
            delete room.state.refillState[s.id];
        } else {
            room.state.refillState[s.id] = s.store.getFreeCapacity(RESOURCE_ENERGY);
        }
    }
    room.structures.extensions.forEach(f);
    room.structures.spawns.forEach(f);
    room.structures.extensions.forEach(f);
}
registerCallback("checkRefill", loadRefillState);
