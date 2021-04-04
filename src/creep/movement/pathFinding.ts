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
            }
        })
    } finally {
        cmModified.forEach(i => {
            i.pos.forEach(p => i.matrix.set(p.x, p.y, p.orig));
        })
    }
    return path;
}
