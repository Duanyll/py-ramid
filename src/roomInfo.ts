import { getRoomDesign } from "designer";
import { tickCarrier } from "roleCarrier";
import { strict } from "assert";

var CallbackStore: { [type: string]: (room: RoomInfo, ...param: any) => void } = {}
export function registerCallback(type: string, func: (room: RoomInfo, ...param: any) => void) {
    CallbackStore[type] = func;
}

export function runCallback(c: RoomCallback, room: RoomInfo) {
    CallbackStore[c.type](room, ...c.param);
}

export interface MoveRequest {
    from: AnyStoreStructure;
    to: AnyStoreStructure;
    type: ResourceConstant;
    amount: number;
    callback?: RoomCallback;
}

class RoomStructures {
    // containers: StructureContainer[] = [];
    controller: StructureController;
    extensions: StructureExtension[] = [];
    extractor?: StructureExtractor;
    factory?: StructureFactory;
    labs: StructureLab[] = [];
    links: StructureLink[] = [];
    nuker?: StructureNuker;
    observer?: StructureObserver;
    powerSpawn?: StructurePowerSpawn;
    // ramparts: StructureRampart[];
    // roads: StructureRoad[] = [];
    spawns: StructureSpawn[] = [];
    storage?: StructureStorage;
    terminal?: StructureTerminal;
    towers: StructureTower[] = [];
    // walls: StructureWall[];

    centerLink?: StructureLink;

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
    design!: RoomDesign;

    moveQueue: MoveRequest[] = [];

    // 只有非日常种田需求产生的 Creep 才需要通过 spawnQueue 维护, 种田 creep 直接按数量维护即可
    spawnQueue: SpawnRequest[] = [];
    state!: RoomState;

    creeps: { [role: string]: Creep[] } = {};
    structures!: RoomStructures;

    public constructor(roomName: string) {
        this.name = roomName;
        this.detail = Game.rooms[this.name];
        if (this.detail.memory) {
            this.load();
        } else {
            this.detail.memory = {} as RoomMemory;
            this.design = this.detail.memory.design = getRoomDesign(this.detail);
            this.state = this.detail.memory.state = {
                status: "normal"
            };
        }
    }

    loadCreeps() {
        this.creeps = {};
        this.detail.find(FIND_MY_CREEPS).forEach((creep) => {
            if (!this.creeps[creep.memory.role]) this.creeps[creep.memory.role] = [];
            this.creeps[creep.memory.role].push(creep);
        });
    }

    public tick(): void {
        this.loadCreeps();
        this.structures = new RoomStructures(this.detail);

        if (this.eventTimer[Game.time]) {
            this.eventTimer[Game.time].forEach(c => runCallback(c, this));
            delete this.eventTimer[Game.time];
        }

        tickCarrier(this);
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
        m.moveQueue = _.map(this.moveQueue, (q) => {
            return { from: q.from.id, to: q.to.id, amount: q.amount, type: q.type, callback: q.callback }
        });
        m.spawnQueue = this.spawnQueue;
        m.design = this.design;
        m.state = this.state;
    }

    public load(): void {
        const m = this.detail.memory;
        this.eventTimer = m.eventTimer;
        this.moveQueue = _.map(m.moveQueue, (q) => {
            return {
                from: Game.getObjectById(q.from) as AnyStoreStructure,
                to: Game.getObjectById(q.to) as AnyStoreStructure,
                amount: q.amount,
                type: q.type,
                callback: q.callback
            }
        });
        this.spawnQueue = m.spawnQueue;
        this.design = m.design;
        this.state = m.state;
    }
}
