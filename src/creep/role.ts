import { RoomInfo } from "room/roomInfo";

export interface CreepRoleDriver {
    readonly creepName: string;
    run: (creep: Creep, room?: RoomInfo) => void;
    die?: () => void;
}

export interface CreepRole {
    new(creepName: string): CreepRoleDriver;
    readonly prototype: CreepRoleDriver;

    autoFlee: boolean;
    spawnInfo?: (room: RoomInfo) => Record<string, BodyPartDescription>;
    body?: Record<number, BodyPartDescription>
    defaultBody?: BodyPartDescription;
}

export abstract class CreepRoleBase implements CreepRoleDriver {
    creepName: string;
    @memorize
    room: string;

    abstract run(creep: Creep, room?: RoomInfo): void;
    constructor(creepName: string) {
        this.creepName = creepName;
    }

    static autoFlee = false;
}

let creepRoleStore = {} as Record<CreepRoleType, CreepRole>;
let roomCreepRoles = {} as Record<CreepRoleType, CreepRole>;
export function creepRole(type: CreepRoleType) {
    return function (ctor: CreepRole) {
        creepRoleStore[type] = ctor;
        if ('spawnInfo' in ctor) {
            roomCreepRoles[type] = ctor;
        }
    }
}

export function memorize<T extends CreepRoleDriver>(proto: T, propName: string) {
    Object.defineProperty(proto, propName, {
        get: function (this: CreepRoleDriver) {
            return (Memory.creeps[this.creepName] as any)[propName];
        },
        set: function (this: CreepRoleDriver, value) {
            (Memory.creeps[this.creepName] as any)[propName] = value;
        },
        enumerable: false,
        configurable: false
    })
}

export function getCreepRole(role: CreepRoleType) {
    return creepRoleStore[role];
}

export function getRoomCreepConfig(room: RoomInfo) {
    let res = {} as {
        [roleId: string]: {
            role: CreepRoleType,
            body: BodyPartDescription,
        };
    };
    _.forIn(roomCreepRoles, (ctor, role: CreepRoleType) => {
        _.assign(res, _.mapValues(ctor.spawnInfo(room), (body) => {
            return { body, role };
        }))
    })
    return res;
}
