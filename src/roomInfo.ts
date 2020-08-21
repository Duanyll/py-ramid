import { designRoom } from "designer";

var CallbackStore: { [type: string]: (room: RoomInfo, ...param: any) => void };
export function registerCallback(type: CallbackType, func: (room: RoomInfo, ...param: any) => void) {
    if (!CallbackStore) CallbackStore = {};
    CallbackStore[type] = func;
}

export function runCallback(c: RoomCallback, room: RoomInfo) {
    CallbackStore[c.type](room, ...c.param);
}

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
    name: string;
    detail: Room;

    public get eventTimer(): { [time: number]: RoomCallback[] } {
        return this.detail.memory.eventTimer;
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
            body: BodyPartDescription
        };
    }

    private _structures?: RoomStructures;
    private _structuresLoadTime = 0;
    public get structures() {
        // 必须每 tick 重建
        if (!this._structures || this._structuresLoadTime < Game.time) {
            this._structures = new RoomStructures(this.detail);
            this._structuresLoadTime = Game.time;
        }
        return this._structures;
    }

    public get design() {
        return this.detail.memory.design;
    }

    public get stats() {
        return this.detail.memory.stats;
    }

    public constructor(roomName: string) {
        this.name = roomName;
        this.detail = Game.rooms[this.name];
        this.checkMemory();
    }

    checkMemory() {
        this.detail.memory = this.detail.memory || {} as RoomMemory;
        let m = this.detail.memory;
        m.design = m.design || designRoom(this.detail);
        m.eventTimer = m.eventTimer || [];
        m.moveQueue = m.moveQueue || [];
        m.spawnQueue = m.spawnQueue || [];
        if (!m.state) {
            m.state = {
                status: "normal",
                refillState: {}
            }
            checkRefillState(this);
        }
    }

    public tickEvents(): void {
        if (this.eventTimer[Game.time]) {
            this.eventTimer[Game.time].forEach(c => runCallback(c, this));
            delete this.eventTimer[Game.time];
        }
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
}

function checkRefillState(room: RoomInfo) {
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
registerCallback("checkRefill", checkRefillState);
