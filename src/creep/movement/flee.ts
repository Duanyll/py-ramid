import cfg from "config";
import { INF, dx, dy } from "utils/constants";
import { createMatrix, Queue } from "utils";
import CostMatrixCache from "./costMatrix";

let fleeMatrixCache: Record<string, { time: number, matrix: CostMatrix }> = {};

function createFleeDisMap(roomName: string): CostMatrix {
    let base = CostMatrixCache.get(roomName, "structure");

    let dis = createMatrix(51, 51, INF);
    let ins = createMatrix(51, 51, false);
    let q = new Queue<PointInRoom>();
    if (!Game.rooms[roomName].info) {
        for (const exit of Game.rooms[roomName].find(FIND_EXIT)) {
            dis[exit.x][exit.y] = 0;
            ins[exit.x][exit.y] = true;
            q.push({ x: exit.x, y: exit.y });
        }
    } else {
        const center = Game.rooms[roomName].info.design.center;
        dis[center.x][center.y] = 0;
        ins[center.x][center.y] = true;
        q.push({ x: center.x, y: center.y });
    }
    while (!q.empty()) {
        let u = q.pop();
        ins[u.x][u.y] = false;
        for (let i = 0; i < 8; i++) {
            const v = { x: u.x + dx[i], y: u.y + dy[i] };
            if (v.x < 0 || v.x >= 50 || v.y < 0 || v.y >= 50) continue;
            if (base.get(v.x, v.y) == 0xff) continue;
            if (dis[u.x][u.y] + 1 < dis[v.x][v.y]) {
                dis[v.x][v.y] = dis[u.x][u.y] + 1;
                if (!ins[v.x][v.y]) {
                    ins[v.x][v.y] = true;
                    q.push(v);
                }
            }
        }
    }

    let res = new PathFinder.CostMatrix();
    for (let i = 0; i < 50; i++) {
        for (let j = 0; j < 50; j++) {
            res.set(i, j, dis[i][j] > 0xff ? 0xff : dis[i][j]);
        }
    }
    return res;
}

function getFleeMatrix(roomName: string) {
    if (fleeMatrixCache[roomName]) {
        if (fleeMatrixCache[roomName].time + cfg.COSTMATRIX_UPDATE < Game.time) {
            return fleeMatrixCache[roomName].matrix;
        }
    }
    fleeMatrixCache[roomName] = {
        time: Game.time,
        matrix: createFleeDisMap(roomName)
    }
    return fleeMatrixCache[roomName].matrix;
}

function surroundingPosition(u: RoomPosition): RoomPosition[] {
    let res: RoomPosition[] = [];
    for (let i = 0; i < 8; i++) {
        const vx = u.x + dx[i];
        const vy = u.y + dy[i];
        if (vx < 0 || vx >= 50 || vy < 0 || vy >= 50) continue;
        res.push(new RoomPosition(vx, vy, u.roomName));
    }
    return res;
}

export function creepFlee(creep: AnyCreep, targets: RoomPosition[]) {
    let matrix = getFleeMatrix(creep.room.name);
    const u = creep.pos;
    const udis = _.sumBy(targets, i => u.getRangeTo(i));
    let strMap = CostMatrixCache.get(creep.room.name, "structure");
    let pos = _.maxBy(surroundingPosition(u), (v) => {
        if (matrix.get(v.x, v.y) == 0xff) return -Infinity;
        let score = 0;
        if (matrix.get(v.x, v.y) < matrix.get(u.x, u.y)) score += 1;
        if (matrix.get(v.x, v.y) > matrix.get(u.x, u.y)) score -= 1;
        const terrain = strMap.get(v.x, v.y);
        if (terrain == 1) {
            score += 1;
        } else if (terrain == 10) {
            score -= 2;
        }
        let vdis = _.sumBy(targets, i => v.getRangeTo(i));
        if (vdis < udis) score += 2;
        if (vdis > udis) score -= 2;
        return score;
    });
    if (pos) creep.move(creep.pos.getDirectionTo(pos));
}

export function getFleeTargets(pos: RoomPosition, range = 5) {
    if (global.myRooms[pos.roomName]) {
        if (global.myRooms[pos.roomName].defense.mode != "peace") {
            return _.filter(global.myRooms[pos.roomName].defense.currentHostiles, h => h.pos.inRangeTo(pos, range));
        } else {
            return null;
        }
    } else {
        return null;
    }
}
