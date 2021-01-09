import { myRooms } from "room/roomInfo";
import Logger from "utils";
import { findRouteCallback, objToPos } from "utils";

Memory.roomsToAvoid ||= {};
Memory.roomCost ||= {};

let movingCreeps: {
    [name: string]: { pos: RoomPosition, range?: number }
}

let blockedRoomMatrix: CostMatrix = new PathFinder.CostMatrix();
for (let i = 0; i < 50; i++) {
    for (let j = 0; j < 50; j++) {
        blockedRoomMatrix.set(i, j, 0xff);
    }
}

let matrixWithCreepsCache: { [room: string]: CostMatrix };

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

function isEqualPosition(a: { x: number, y: number, roomName: string }, b: { x: number, y: number, roomName: string }) {
    return a.x == b.x && a.y == b.y && a.roomName == b.roomName;
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
    if (!creep.my) return false;
    // @ts-ignore
    if (creep.memory.role == "manage") return false;
    if (movingCreeps[creep.name] || creepPostionLock[creep.name]) return false;
    return true;
}

function getCreepFindPathOpts(creep: AnyCreep, target: { pos: RoomPosition, range?: number }): FindPathOpts {
    const sameRoom = (creep.room.name == target.pos.roomName);
    const pathReuse = (creep.pos.inRangeTo(target, 5)) ? 5 : 15;

    return {
        // @ts-ignore
        reusePath: pathReuse,
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
        range: target.range
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
                } else if (Game.time & 1 && this.memory._move && this.memory._move.dest) {
                    let dest = this.memory._move.dest;
                    let pos = new RoomPosition(dest.x, dest.y, dest.room);
                    if (pos.x != tarpos.x || pos.y != tarpos.y || pos.roomName != tarpos.roomName) {
                        let path = this.pos.findPathTo(pos, getCreepFindPathOpts(this, { pos: objToPos(dest) }));
                        if (path.length) {
                            this.memory._move.time = Game.time;
                            this.memory._move.path = Room.serializePath(path);
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

export function moveCreepTo(creep: Creep, pos: RoomPosition | { pos: RoomPosition }, range?: number) {
    if (!(pos instanceof RoomPosition)) pos = pos.pos;
    movingCreeps[creep.name] = { pos, range };
}

let creepPostionLock: { [name: string]: boolean } = {};
function wrapPositionLockFunc(funcName: keyof Creep["prototype"]) {
    const func = Creep.prototype[funcName] as (this: Creep, ...param: any) => ScreepsReturnCode;
    // @ts-expect-error 2540
    Creep.prototype[funcName] = function (this: Creep, ...param) {
        let res = func.call(this, ...param);
        if (res == OK) {
            creepPostionLock[this.name] = true;
        }
        return res;
    }
}
wrapPositionLockFunc("build");
wrapPositionLockFunc("repair");
wrapPositionLockFunc("upgradeController");
wrapPositionLockFunc("harvest");
wrapPositionLockFunc("reserveController")

export function lockCreepPosition(creep: Creep) {
    creepPostionLock[creep.name] = true;
}

export function tickMoveHelper() {
    _.forIn(movingCreeps, (pos, name) => {
        const creep = Game.creeps[name];
        creep.moveTo(pos, getCreepFindPathOpts(creep, pos));
    })
}

interface ExitingCreepMemory extends CreepMemory {
    _exitInfo: {
        target: string,
        x?: number,
        y?: number,
        room?: string,
        route: { room: string, exit: ExitConstant }[] | ERR_NO_PATH
    }
}

export function moveCreepToRoom(creep: Creep, room: string) {
    if (creep.room.name == room) {
        Logger.assert(`${creep.name} - Don't use moveCreepToRoom in the same room`);
        return;
    }
    let m = creep.memory as ExitingCreepMemory;
    if (!m._exitInfo || m._exitInfo.target != room || !m._exitInfo.route) {
        let route = Game.map.findRoute(creep.room, room, {
            routeCallback: findRouteCallback
        });
        if (route == ERR_NO_PATH) {
            Logger.error(`${creep.name}: No path to ${room}!`)
        }
        m._exitInfo = { target: room, route }
    }
    if (m._exitInfo.room != creep.room.name) {
        if (m._exitInfo.route == ERR_NO_PATH) return;
        let exit = m._exitInfo.route.shift();
        let exits = Game.map.describeExits(creep.room.name);
        if (!exit || exit.room != exits[exit.exit]) {
            delete m._exitInfo;
            moveCreepToRoom(creep, room);
            return;
        }
        let exitPos = creep.pos.findClosestByPath(exit.exit);
        m._exitInfo.room = creep.room.name;
        m._exitInfo.x = exitPos.x;
        m._exitInfo.y = exitPos.y;
    }
    moveCreepTo(creep, new RoomPosition(m._exitInfo.x, m._exitInfo.y, creep.room.name));
}
