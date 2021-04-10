import Logger, { getRoomType, roomNameToXY } from "utils";
import { OPPOSITE_EXIT } from "utils/constants";
import { canBypassCreep } from "./bypass";
import CostMatrixCache from "./costMatrix";

const blockedRoomMatrix: CostMatrix = new PathFinder.CostMatrix();
for (let i = 0; i < 50; i++) {
    for (let j = 0; j < 50; j++) {
        blockedRoomMatrix.set(i, j, 0xff);
    }
}

Memory.roomsToAvoid ||= {};
Memory.roomCost ||= {};
export function getRoomFindPathOpts(creep: AnyCreep, opts?: GoToPosOpts): FindPathOpts {
    const sameRoom = opts && (!opts.crossRoom) && (creep.room.name == opts.pos.roomName);

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
        range: opts?.range
    };
}

export function findPath(creep: AnyCreep, opts: GoToPosOpts, forceUpdate?: boolean): PathFinderPath {
    const sameRoom = opts && (!opts.crossRoom) && (creep.room.name == opts.pos.roomName);
    let cmModified: { matrix: CostMatrix, pos: { x: number, y: number, orig: number }[] }[] = [];

    let path: PathFinderPath;
    try {
        path = PathFinder.search(creep.pos, { pos: opts.pos, range: opts.range ?? 1 }, {
            roomCallback: (room) => {
                if (sameRoom && room != creep.pos.roomName) return false;
                if (forceUpdate) CostMatrixCache.forceUpdate(room);
                const matrix = CostMatrixCache.get(room, "structure");
                if (!matrix) return false;
                if (Game.rooms[room]) {
                    const modInfo = { matrix, pos: [] as any[] };
                    cmModified.push(modInfo);
                    Game.rooms[room].find(FIND_CREEPS).forEach((c) => {
                        if (!canBypassCreep(creep, c)) {
                            modInfo.pos.push({ x: c.pos.x, y: c.pos.y, orig: matrix.get(c.pos.x, c.pos.y) });
                            matrix.set(c.pos.x, c.pos.y, 0xff);
                        }
                    });
                }
                return matrix;
            },
            plainCost: 2,
            swampCost: 10
        })
    } finally {
        cmModified.forEach(i => {
            i.pos.forEach(p => i.matrix.set(p.x, p.y, p.orig));
        })
    }
    return path;
}


export function findRouteCallback(roomName: string) {
    if (Memory.roomsToAvoid[roomName]) return Infinity;
    if (Memory.roomCost[roomName]) return Memory.roomCost[roomName];
    let type = getRoomType(roomName);
    let isMyRoom = Game.rooms[roomName]?.controller?.my;
    if (type == "highway" || type == "crossroad" || isMyRoom) {
        return 1;
    } else {
        return 1.5;
    }
}

function getDistanceByPath(from: RoomPosition, type: FindConstant) {
    switch (type) {
        case FIND_EXIT_BOTTOM:
            return 50 - from.y;
        case FIND_EXIT_TOP:
            return from.y;
        case FIND_EXIT_LEFT:
            return from.x;
        case FIND_EXIT_RIGHT:
            return 50 - from.x;
        default:
            if (!Game.rooms[from.roomName]) return 25;
            let goals = _.map(Game.rooms[from.roomName].find(type), (i) => {
                if ('pos' in i) i = i.pos as RoomPosition;
                return { range: 1, pos: i };
            });
            let path = PathFinder.search(from, goals, {
                roomCallback: (name) => {
                    if (name != from.roomName) return false;
                },
                plainCost: 1,
                swampCost: 5
            });
            return path.cost;
    }
}

export function estimateDistance(a: RoomPosition, b: RoomPosition) {
    if (a.roomName == b.roomName) {
        const path = PathFinder.search(a, b);
        return path.cost;
    } else {
        let longPath = Game.map.findRoute(a.roomName, b.roomName, { routeCallback: findRouteCallback });
        if (longPath == ERR_NO_PATH) return Infinity;
        let dis = 0;
        dis += getDistanceByPath(a, longPath[0].exit);
        dis += 50 * (longPath.length - 1);
        dis += getDistanceByPath(b, OPPOSITE_EXIT[_.last(longPath).exit]);
        return dis;
    }
}

