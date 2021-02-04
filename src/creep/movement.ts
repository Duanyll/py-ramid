import { myRooms } from "room/roomInfo";
import Logger from "utils";
import { findRouteCallback, objToPos } from "utils";

Memory.roomsToAvoid ||= {};
Memory.roomCost ||= {};

let movingCreeps: Record<string, CreepMovement>;
let matrixWithCreepsCache: Record<string, CostMatrix>;
const blockedRoomMatrix: CostMatrix = new PathFinder.CostMatrix();
for (let i = 0; i < 50; i++) {
    for (let j = 0; j < 50; j++) {
        blockedRoomMatrix.set(i, j, 0xff);
    }
}
let creepPostionLock: Record<string, boolean> = {};

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

export function prepareMoveHelper() {
    movingCreeps = {}
    matrixWithCreepsCache = {};
    creepPostionLock = {};
}

function canBypassCreep(creep: AnyCreep) {
    if (!creep.my) return false;
    // @ts-ignore
    if (creep.memory.role == "manage") return false;
    if (movingCreeps[creep.name]) return true;
    if (creepPostionLock[creep.name]) return false;
    return true;
}

function shouldDoBypassCreep(creep: AnyCreep) {
    // @ts-ignore
    if (creep.fatigue) return false;
    if (!creep.my) return false;
    // @ts-ignore
    if (creep.memory.role == "manage") return false;
    if (movingCreeps[creep.name] || creepPostionLock[creep.name]) return false;
    return true;
}

function getCreepFindPathOpts(creep: AnyCreep, opts: MoveToPosOpts): FindPathOpts {
    const sameRoom = (!opts.crossRoom) && (creep.room.name == opts.pos.roomName);

    return {
        ignoreCreeps: true,
        // @ts-ignore 7030
        costCallback: (room: string, matrix: CostMatrix) => {
            if (sameRoom && room != creep.pos.roomName) return blockedRoomMatrix;
            if (Game.rooms[room]) {
                Game.rooms[room].find(FIND_CREEPS).forEach((c) => {
                    if (!canBypassCreep(c)) {
                        matrix.set(c.pos.x, c.pos.y, 0xff);
                    }
                });
            }
        },
        range: opts.range
    };
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
const defaultCreepMove = Creep.prototype.move;
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
                if (shouldDoBypassCreep(targetCreep)) {
                    // @ts-ignore 2345
                    defaultCreepMove.call(targetCreep, ((target + 3) % 8 + 1) as DirectionConstant);
                } else if (Game.time & 1 && this.moveInfo && this.moveInfo.dest) {
                    let dest = this.moveInfo.dest;
                    if (!dest.isEqualTo(tarpos)) {
                        let path = this.pos.findPathTo(dest, getCreepFindPathOpts(this, { pos: dest }));
                        if (path.length) {
                            this.moveInfo.time = Game.time;
                            this.moveInfo.path = path;
                            // @ts-ignore 2345
                            return defaultCreepMove.call(this, path[0].direction);
                        }
                    }
                }
            }
        }
    }

    // @ts-ignore 2345
    return defaultCreepMove.call(this, target);
}

// @ts-ignore 2322
Creep.prototype.move = moveBypass;
// @ts-ignore 2322
PowerCreep.prototype.move = function (this: PowerCreep, target: DirectionConstant | Creep) {
    if (!this.room) return ERR_BUSY;
    return moveBypass.call(this, target);
}

/** @deprecated */
export function moveCreepTo(creep: Creep, pos: RoomPosition | { pos: RoomPosition }, range?: number) {
    if (!(pos instanceof RoomPosition)) pos = pos.pos;
    creep.movement = { pos, range };
}

let moveInfo: Record<string, CreepMoveInfo> = {}
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

function wrapPositionLockFunc(funcName: keyof Creep["prototype"]) {
    const func = Creep.prototype[funcName] as (this: Creep, ...param: any) => ScreepsReturnCode;
    // @ts-expect-error 2540
    Creep.prototype[funcName] = function (this: Creep, ...param) {
        let res = func.call(this, ...param);
        if (res == OK) {
            this.posLock = true;
        }
        return res;
    }
}
wrapPositionLockFunc("build");
wrapPositionLockFunc("repair");
wrapPositionLockFunc("upgradeController");
wrapPositionLockFunc("harvest");
wrapPositionLockFunc("reserveController")

/** @deprecated */
export function lockCreepPosition(creep: Creep) {
    creep.posLock = true;
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

let exitInfo: Record<string, CreepExitInfo> = {}

/** @deprecated */
export function moveCreepToRoom(creep: Creep, room: string) {
   creep.movement = { room };
}

function doMoveCreepToRoom(creep: AnyCreep, room: string) {
    if (!creep.exitInfo || creep.exitInfo.target != room || !creep.exitInfo.route) {
        let route = Game.map.findRoute(creep.room, room, {
            routeCallback: findRouteCallback
        });
        if (route == ERR_NO_PATH) {
            Logger.error(`${creep.name}: No path to ${room}!`)
        }
        creep.exitInfo = { target: room, route }
    }
    if (creep.exitInfo.exitPos?.roomName != creep.room.name) {
        if (creep.exitInfo.route == ERR_NO_PATH) return;
        let exit = creep.exitInfo.route.shift();
        let exits = Game.map.describeExits(creep.room.name);
        if (!exit || exit.room != exits[exit.exit]) {
            delete creep.exitInfo;
            doMoveCreepToRoom(creep, room);
            return;
        }
        creep.exitInfo.exitPos = creep.pos.findClosestByPath(exit.exit);
    }
    doMoveCreepTo(creep, { pos: creep.exitInfo.exitPos });
}

export function clearCreepMoveCache(name?: string) {
    if (name) {
        delete exitInfo[name];
        delete moveInfo[name];
    } else {
        exitInfo = {};
        moveInfo = {};
    }
}

const movementExtensions = {
    movement: {
        get: function (this: Creep) {
            return movingCreeps[this.name];
        },
        set: function (this: Creep, v: CreepMovement) {
            if (!this.my) return;
            if ('room' in v && v.room == this.room.name) return;
            movingCreeps[this.name] = v;
        },
        enumerable: false,
        configurable: true
    },
    exitInfo: {
        get: function (this: Creep) {
            return exitInfo[this.name];
        },
        set: function (this: Creep, v: CreepExitInfo) {
            exitInfo[this.name] = v;
        },
        enumerable: false,
        configurable: true
    },
    posLock: {
        get: function (this: Creep) {
            return creepPostionLock[this.name];
        },
        set: function (this: Creep, v: boolean) {
            creepPostionLock[this.name] = v;
        },
        enumerable: false,
        configurable: true
    },
    moveInfo: {
        get: function (this: Creep) {
            return moveInfo[this.name];
        },
        set: function (this: Creep, v: CreepMoveInfo) {
            moveInfo[this.name] = v;
        },
        enumerable: false,
        configurable: true
    }
}
Object.defineProperties(Creep.prototype, movementExtensions);
Object.defineProperties(PowerCreep.prototype, movementExtensions);
