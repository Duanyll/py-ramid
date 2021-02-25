import { myRooms } from "room/roomInfo";
import Logger from "utils";
import { findRouteCallback, objToPos } from "utils";

/* -------------------------------------------------------------------------- */
/*                             movement info cache                            */
/* -------------------------------------------------------------------------- */

interface CreepExitInfo {
    target: string,
    exitPos?: RoomPosition,
    route: { room: string, exit: ExitConstant }[] | ERR_NO_PATH
}

interface CreepMoveInfo {
    dest: RoomPosition;
    time: number;
    path: PathStep[];
}

declare global {
    interface Creep {
        exitInfo: CreepExitInfo,
        moveInfo: CreepMoveInfo,
    }

    interface PowerCreep {
        exitInfo: CreepExitInfo,
        moveInfo: CreepMoveInfo,

        fatigue: undefined;
    }
}


let movingCreeps: Record<string, CreepMovement>;
let moveInfo: Record<string, CreepMoveInfo> = {};
let exitInfo: Record<string, CreepExitInfo> = {};
let matrixWithCreepsCache: Record<string, CostMatrix>;
export function clearCreepMoveCache(name?: string) {
    if (name) {
        delete exitInfo[name];
        delete moveInfo[name];
    } else {
        exitInfo = {};
        moveInfo = {};
    }
}

const movementCacheExtensions = {
    movement: {
        get: function (this: AnyCreep) {
            return movingCreeps[this.name];
        },
        set: function (this: AnyCreep, v: CreepMovement) {
            if (!this.my) return;
            if ('room' in v && v.room == this.room.name) return;
            movingCreeps[this.name] = v;
        },
        enumerable: false,
        configurable: true
    },
    exitInfo: {
        get: function (this: AnyCreep) {
            return exitInfo[this.name];
        },
        set: function (this: AnyCreep, v: CreepExitInfo) {
            exitInfo[this.name] = v;
        },
        enumerable: false,
        configurable: true
    },
    posLock: {
        get: function (this: AnyCreep) {
            return creepPostionLock[this.name];
        },
        set: function (this: AnyCreep, v: boolean) {
            creepPostionLock[this.name] = v;
        },
        enumerable: false,
        configurable: true
    },
    moveInfo: {
        get: function (this: AnyCreep) {
            return moveInfo[this.name];
        },
        set: function (this: AnyCreep, v: CreepMoveInfo) {
            moveInfo[this.name] = v;
        },
        enumerable: false,
        configurable: true
    }
}
Object.defineProperties(Creep.prototype, movementCacheExtensions);
Object.defineProperties(PowerCreep.prototype, movementCacheExtensions);

/* -------------------------------------------------------------------------- */
/*                                 pathfinding                                */
/* -------------------------------------------------------------------------- */

const blockedRoomMatrix: CostMatrix = new PathFinder.CostMatrix();
for (let i = 0; i < 50; i++) {
    for (let j = 0; j < 50; j++) {
        blockedRoomMatrix.set(i, j, 0xff);
    }
}

function getRoomCostMatrix(room: string): CostMatrix {
    if (!matrixWithCreepsCache[room]) {
        matrixWithCreepsCache[room] = (myRooms[room])
            ? myRooms[room].matrixCache.clone() : new PathFinder.CostMatrix();
        if (Game.rooms[room]) {
            Game.rooms[room].find(FIND_CREEPS).forEach((c) => {
                if (!c.my || !movingCreeps[c.name]) {
                    matrixWithCreepsCache[room].set(c.pos.x, c.pos.y, 0xff);
                }
            });
        }
    }
    return matrixWithCreepsCache[room];
}

Memory.roomsToAvoid ||= {};
Memory.roomCost ||= {};
function getCreepFindPathOpts(creep: AnyCreep, opts: MoveToPosOpts): FindPathOpts {
    const sameRoom = (!opts.crossRoom) && (creep.room.name == opts.pos.roomName);

    return {
        ignoreCreeps: true,
        costCallback: (room: string, matrix: CostMatrix) => {
            if (sameRoom && room != creep.pos.roomName) return blockedRoomMatrix;
            if (Game.rooms[room]) {
                Game.rooms[room].find(FIND_CREEPS).forEach((c) => {
                    if (!canBypassCreep(creep, c)) {
                        matrix.set(c.pos.x, c.pos.y, 0xff);
                    }
                });
            }
        },
        range: opts.range
    };
}

/* -------------------------------------------------------------------------- */
/*                                 move bypass                                */
/* -------------------------------------------------------------------------- */

function canBypassCreep(i: AnyCreep, creep: AnyCreep) {
    if (!creep.my) return false;
    if (creep.memory.role == "manage") return false;
    if (i.memory.role == creep.memory.role) return false;
    if (movingCreeps[creep.name]) return true;
    if (creepPostionLock[creep.name]) return false;
    return true;
}

function shouldDoBypassCreep(i: AnyCreep, creep: AnyCreep) {
    if (creep.fatigue) return false;
    if (!creep.my) return false;
    if (creep.memory.role == "manage") return false;
    if (i.memory.role == creep.memory.role) return false;
    if (movingCreeps[creep.name] || creepPostionLock[creep.name]) return false;
    return true;
}

const offsetsByDirection = {
    [TOP]: [0, -1],
    [TOP_RIGHT]: [1, -1],
    [RIGHT]: [1, 0],
    [BOTTOM_RIGHT]: [1, 1],
    [BOTTOM]: [0, 1],
    [BOTTOM_LEFT]: [-1, 1],
    [LEFT]: [-1, 0],
    [TOP_LEFT]: [-1, -1]
};
const defaultCreepMove = Creep.prototype.move as (dir: number | Creep) => CreepMoveReturnCode;
function moveBypass(this: AnyCreep, target: DirectionConstant | Creep) {
    function getTargetpos(pos: RoomPosition, dir: DirectionConstant) {
        let x = pos.x + offsetsByDirection[dir][0];
        let y = pos.y + offsetsByDirection[dir][1];
        if (x < 0 || x > 49 || y < 0 || y > 49) return undefined;
        return new RoomPosition(x, y, pos.roomName);
    }
    if (!(target instanceof Creep)) {
        let tarpos = getTargetpos(this.pos, target);
        if (tarpos) {
            let targetCreep = tarpos.lookFor(LOOK_CREEPS)[0] || tarpos.lookFor(LOOK_POWER_CREEPS)[0];
            if (targetCreep) {
                if (shouldDoBypassCreep(this, targetCreep)) {
                    defaultCreepMove.call(targetCreep, ((target + 3) % 8 + 1));
                } else if (Game.time & 1 && this.moveInfo && this.moveInfo.dest) {
                    let dest = this.moveInfo.dest;
                    if (!dest.isEqualTo(tarpos)) {
                        let path = this.pos.findPathTo(dest, getCreepFindPathOpts(this, { pos: dest }));
                        if (path.length) {
                            this.moveInfo.time = Game.time;
                            this.moveInfo.path = path;
                            return defaultCreepMove.call(this, path[0].direction);
                        }
                    }
                }
            }
        }
    }

    return defaultCreepMove.call(this, target);
}

Object.defineProperty(Creep.prototype, 'move', {
    value: moveBypass,
    enumerable: false,
    configurable: true
});
Object.defineProperty(PowerCreep.prototype, 'move', {
    value: function (this: PowerCreep, target: DirectionConstant | Creep) {
        if (!this.room) return ERR_BUSY;
        return moveBypass.call(this, target);
    },
    enumerable: false,
    configurable: true
})

let creepPostionLock: Record<string, boolean> = {};
function wrapPositionLockFunc(funcName: keyof Creep["prototype"]) {
    const func = Creep.prototype[funcName] as (this: Creep, ...param: any) => ScreepsReturnCode;
    (Creep.prototype as any)[funcName] = function (this: Creep, ...param: any) {
        let res = func.call(this, ...param);
        if (res == OK) {
            this.posLock = true;
        }
        return res;
    }
}
// wrapPositionLockFunc("build");
// wrapPositionLockFunc("repair");
wrapPositionLockFunc("upgradeController");
wrapPositionLockFunc("harvest");
wrapPositionLockFunc("reserveController");

/** @deprecated */
export function lockCreepPosition(creep: Creep) {
    creep.posLock = true;
}

/* -------------------------------------------------------------------------- */
/*                              movement process                              */
/* -------------------------------------------------------------------------- */

const movementExtensions = {
    goTo: {
        value: function (this: AnyCreep, target: RoomPosition | { pos: RoomPosition }, range = 1) {
            let pos = (target instanceof RoomPosition) ? target : target.pos;
            if (this.pos.inRangeTo(pos, range)) {
                return true;
            } else {
                this.movement = { pos, range };
                return false;
            }
        },
        configurable: true,
        enumerable: false
    },
    goToRoom: {
        value: function (this: AnyCreep, room: string) {
            if (this.room.name == room) {
                return true;
            } else {
                this.movement = { room };
                return false;
            }
        },
        configurable: true,
        enumerable: false
    }
};
Object.defineProperties(Creep.prototype, movementExtensions);
Object.defineProperties(PowerCreep.prototype, movementExtensions);

export function prepareMoveHelper() {
    movingCreeps = {}
    matrixWithCreepsCache = {};
    creepPostionLock = {};
}

export function tickMoveHelper() {
    _.forIn(movingCreeps, (pos, name) => {
        const creep = Game.creeps[name] || Game.powerCreeps[name];
        if ('room' in pos) {
            doMoveCreepToRoom(creep, pos.room);
        } else {
            doMoveCreepTo(creep, pos);
        }
    })
}

/** @deprecated use `creep.goTo` */
export function moveCreepTo(creep: Creep, pos: RoomPosition | { pos: RoomPosition }, range?: number) {
    creep.goTo(pos, range);
}

export function doMoveCreepTo(creep: AnyCreep, opts: MoveToPosOpts) {
    const pathReuse = (creep.pos.inRangeTo(opts.pos, 5)) ? 5 : 15;

    if (!creep.moveInfo || !creep.moveInfo.dest.isEqualTo(opts.pos) || creep.moveInfo.time + pathReuse < Game.time) {
        creep.moveInfo = {
            dest: opts.pos,
            time: Game.time,
            path: creep.pos.findPathTo(opts.pos, getCreepFindPathOpts(creep, opts))
        }
    }

    creep.moveByPath(creep.moveInfo.path);
}

/** @deprecated use `creep.goToRoom` */
export function moveCreepToRoom(creep: Creep, room: string) {
    creep.goToRoom(room);
}

function doMoveCreepToRoom(creep: AnyCreep, room: string) {
    function reFindPath() {
        let route = Game.map.findRoute(creep.room, room, {
            routeCallback: findRouteCallback
        });
        if (route == ERR_NO_PATH) {
            Logger.error(`${creep.name}: No path to ${room}!`);
            return false;
        }
        creep.exitInfo = { target: room, route }
        return true;
    }
    if (!creep.exitInfo || creep.exitInfo.target != room || !creep.exitInfo.route) {
        if (!reFindPath()) return;
    }
    if (!creep.exitInfo.exitPos || creep.exitInfo.exitPos.roomName != creep.room.name) {
        if (creep.exitInfo.route == ERR_NO_PATH) return;
        let exit = creep.exitInfo.route.shift();
        let exits = Game.map.describeExits(creep.room.name);
        if (!exit || exit.room != exits[exit.exit]) {
            if (!reFindPath()) return;
            exit = creep.exitInfo.route.shift();
        }
        creep.exitInfo.exitPos = creep.pos.findClosestByPath(exit.exit, { ignoreCreeps: true });
    }
    doMoveCreepTo(creep, { pos: creep.exitInfo.exitPos });
}
