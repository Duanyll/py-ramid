import { managedRooms } from "roomInfo";

let creepMoveRequests: {
    [name: string]: RoomPosition
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
        matrixWithCreepsCache[room] = (managedRooms[room])
            ? managedRooms[room].matrixCache.clone() : new PathFinder.CostMatrix();
        if (Game.rooms[room]) {
            Game.rooms[room].find(FIND_CREEPS).forEach((c) => {
                if (!c.my || !creepMoveRequests[c.name]) {
                    matrixWithCreepsCache[room].set(c.pos.x, c.pos.y, 0xff);
                }
            });
        }
    }
    return matrixWithCreepsCache[room];
}

export function prepareMoveHelper() {
    creepMoveRequests = {}
    matrixWithCreepsCache = {};
}

function isEqualPosition(a: { x: number, y: number, roomName: string }, b: { x: number, y: number, roomName: string }) {
    return a.x == b.x && a.y == b.y && a.roomName == b.roomName;
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
                if (targetCreep.my && (targetCreep.memory as CreepMemory).role != "manage") {
                    if (!creepMoveRequests[targetCreep.name]) {
                        // @ts-ignore 2345
                        defaultCreepMove.call(targetCreep, ((target + 3) % 8 + 1) as DirectionConstant);
                    }
                } else if (Game.time & 1 && this.memory._move && this.memory._move.dest) {
                    let dest = this.memory._move.dest;
                    let pos = new RoomPosition(dest.x, dest.y, dest.room);
                    if (pos.x != tarpos.x || pos.y != tarpos.y || pos.roomName != tarpos.roomName) {
                        let path = this.pos.findPathTo(pos);
                        if (path.length) {
                            this.memory._move.time = Game.time;
                            this.memory._move.path = Room.serializePath(path);
                            // @ts-ignore 2345
                            return defaultCreepMove.call(this, path[0].direction as DirectionConstant);
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
    if (this.room) return ERR_BUSY;
    return moveBypass.call(this, target);
}

export function moveCreepTo(creep: Creep, pos: RoomPosition | { pos: RoomPosition }) {
    if (!(pos instanceof RoomPosition)) pos = pos.pos;
    creepMoveRequests[creep.name] = pos;
}

export function tickMoveHelper() {
    _.forIn(creepMoveRequests, (pos, name) => {
        const creep = Game.creeps[name];

        const sameRoom = (creep.room.name == pos.roomName);
        const pathReuse = (creep.pos.inRangeTo(pos, 5)) ? 5 : 15;

        creep.moveTo(pos, {
            reusePath: pathReuse,
            ignoreCreeps: true,
            // @ts-ignore 7030
            costCallback: (room: string, matrix: CostMatrix) => {
                if (sameRoom && room != creep.pos.roomName) return blockedRoomMatrix;
                if (Game.rooms[room]) {
                    Game.rooms[room].find(FIND_CREEPS).forEach((c) => {
                        if (c.my && !creepMoveRequests[c.name]) {
                            matrix.set(c.pos.x, c.pos.y, 0xff);
                        }
                    });
                }
            }
        });
    })
}

interface ExitingCreepMemory extends CreepMemory {
    _exitInfo: { target: string, x: number, y: number, room: string }
}

export function moveCreepToRoom(creep: Creep, room: string) {
    let m = creep.memory as ExitingCreepMemory;
    if (!m._exitInfo || m._exitInfo.target != room || m._exitInfo.room != creep.room.name) {
        let route = Game.map.findRoute(creep.room, room, {
            routeCallback: (roomName) => {
                if (Memory.roomsToAvoid[roomName]) return Infinity;
                let parsed = /^[WE]([0-9]+)[NS]([0-9]+)$/.exec(roomName);
                let isHighway = (Number(parsed[1]) % 10 === 0) ||
                    (Number(parsed[2]) % 10 === 0);
                let isMyRoom = Game.rooms[roomName] &&
                    Game.rooms[roomName].controller &&
                    Game.rooms[roomName].controller.my;
                if (isHighway || isMyRoom) {
                    return 1;
                } else {
                    return 1.5;
                }
            }
        }) as { exit: ExitConstant, room: string }[];
        const dir = route[0].exit;
        let exit = creep.pos.findClosestByPath(dir);
        m._exitInfo = { target: room, room: creep.room.name, x: exit.x, y: exit.y };
    }
    moveCreepTo(creep, new RoomPosition(m._exitInfo.x, m._exitInfo.y, creep.room.name));
}
