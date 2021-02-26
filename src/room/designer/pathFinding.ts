import { createMatrix, Queue } from "utils";
import { INF, dx, dy } from "./constants";

/**
 * 使用 SPFA 算法计算特定点出发到房间内所有点的最短距离
 * @param terrain 地形
 * @param x 起点 x 坐标
 * @param y 起点 y 坐标
 */
export function getDisMap(matrix: string[][], x: number, y: number): number[][] {
    let dis = createMatrix(51, 51, INF);
    let ins = createMatrix(51, 51, false);
    let q = new Queue<PointInRoom>();
    q.push({x, y});
    dis[x][y] = 0;
    ins[x][y] = true;
    while (!q.empty()) {
        let u = q.pop();
        ins[u.x][u.y] = false;
        for (let i = 0; i < 8; i++) {
            const v = { x: u.x + dx[i], y: u.y + dy[i] };
            if (v.x < 0 || v.x >= 50 || v.y < 0 || v.y >= 50) continue;
            let w: number;
            switch (matrix[v.x][v.y]) {
                case 'r':
                case ' ':
                    w = 1;
                    break;
                case '~':
                    w = 5;
                    break;
                default:
                    continue;
            }
            if (dis[u.x][u.y] + w < dis[v.x][v.y]) {
                dis[v.x][v.y] = dis[u.x][u.y] + w;
                if (!ins[v.x][v.y]) {
                    ins[v.x][v.y] = true;
                    q.push(v);
                }
            }
        }
    }
    return dis;
}

/**
 * 找到距离目标点距离之和最近的点
 * @param matrix 地形
 * @param points 目标点
 */
export function getRelativeRoomCenter(matrix: string[][], points: PointInRoom[]): PointInRoom {
    let dis = createMatrix(51, 51, 0);
    points.forEach((pos) => {
        let t = getDisMap(matrix, pos.x, pos.y);
        for (let i = 0; i < 50; i++) {
            for (let j = 0; j < 50; j++) {
                if (t[i][j] >= INF) {
                    dis[i][j] = INF;
                } else {
                    dis[i][j] += t[i][j];
                }
            }
        }
    });

    let minval = INF, minx = 0, miny = 0;
    for (let i = 0; i < 50; i++) {
        for (let j = 0; j < 50; j++) {
            if (dis[i][j] < minval) {
                minval = dis[i][j];
                minx = i;
                miny = j;
            }
        }
    }
    return { x: minx, y: miny };
}

function posToId(x: number, y: number) { return x * 50 + y; }
function idToPos(id: number) { return { x: _.floor(id / 50), y: id % 50 } }

/**
 * 在部分设计图的基础上进行单源最短路
 * @param matrix 房间的已有的设计图, 可以填充部分建筑和道路
 * @param x 起点
 * @param y 起点
 * @returns [dis, fa] 数组以便生成路径
 */
function spfaPath(matrix: string[][], x: number, y: number): [number[][], number[][]] {
    let dis = createMatrix(51, 51, INF);
    let ins = createMatrix(51, 51, false);
    let fa = createMatrix(51, 51, -1);
    let q = new Queue<PointInRoom>();
    q.push({ x, y });
    dis[x][y] = 0;
    ins[x][y] = true;
    while (!q.empty()) {
        let u = q.pop();
        ins[u.x][u.y] = false;
        for (let i = 0; i < 8; i++) {
            const v = { x: u.x + dx[i], y: u.y + dy[i] };
            if (v.x < 0 || v.x >= 50 || v.y < 0 || v.y >= 50) continue;
            let w: number;
            switch (matrix[v.x][v.y]) {
                case 'r':
                case ' ':
                    w = 1;
                    break;
                case '~':
                    w = 5;
                    break;
                default:
                    continue;
            }
            if (dis[u.x][u.y] + w < dis[v.x][v.y]) {
                dis[v.x][v.y] = dis[u.x][u.y] + w;
                fa[v.x][v.y] = posToId(u.x, u.y);
                if (!ins[v.x][v.y]) {
                    ins[v.x][v.y] = true;
                    q.push(v);
                }
            }
        }
    }
    return [fa, dis];
}

type Route = PointInRoom[];
/**
 * 返回已有设计图上的路径, 同时把路径填充到 matrix 上
 * @param matrix matrix 房间的已有的设计图, 可以填充部分建筑和道路
 * @param center 起点
 * @param targets 终点
 */
export function getRoutes(matrix: string[][], center: PointInRoom, targets: PointInRoom[]): Route[] {
    const sid = posToId(center.x, center.y);
    let [fa, dis] = spfaPath(matrix, center.x, center.y);
    function fillRoute(s: PointInRoom): Route {
        let route: Route = [];
        let mindis = INF;
        let nx = s.x, ny = s.y;
        for (let i = 0; i < 8; i++) {
            if (dis[s.x + dx[i]][s.y + dy[i]] < mindis) {
                nx = s.x + dx[i];
                ny = s.y + dy[i];
                mindis = dis[nx][ny];
            }
        }
        if (dis[nx][ny] == INF) return [];
        let cur = posToId(nx, ny);
        while (fa[nx][ny] != sid) {
            matrix[nx][ny] = 'r';
            route.push({ x: nx, y: ny});
            cur = fa[nx][ny];
            nx = idToPos(cur).x;
            ny = idToPos(cur).y;
        }
        return route;
    }
    return _.map(targets, fillRoute);
}
