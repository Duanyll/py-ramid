import { Queue, Point, createMatrix, printMatrix } from "utils/DataStructure";

function posToId(x: number, y: number) { return x * 50 + y; }
function idToPos(id: number) { return [Math.floor(id / 50), id % 50]; }

const INF = 0x3f3f3f3f;
// 返回从关键点开始 spfa 得到的路程图
const dx = [0, 1, 0, -1, 1, 1, -1, -1];
const dy = [1, 0, -1, 0, 1, -1, -1, 1];
function spfaDisMap(terrain: RoomTerrain, x: number, y: number): number[][] {
    let dis = createMatrix(51, 51, INF);
    let ins = createMatrix(51, 51, false);
    let q = new Queue<[number, number]>();
    q.push([x, y]);
    dis[x][y] = 0;
    ins[x][y] = true;
    while (!q.empty()) {
        let u = q.pop();
        ins[u[0]][u[1]] = false;
        for (let i = 0; i < 8; i++) {
            let v: [number, number] = [u[0] + dx[i], u[1] + dy[i]];
            if (v[0] < 0 || v[0] >= 50 || v[1] < 0 || v[1] >= 50) continue;
            let w: number;
            switch (terrain.get(v[0], v[1])) {
                case 0:
                    w = 1;
                    break;
                case TERRAIN_MASK_WALL:
                    continue;
                case TERRAIN_MASK_SWAMP:
                    w = 5;
                    break;
            }
            if (dis[u[0]][u[1]] + w < dis[v[0]][v[1]]) {
                dis[v[0]][v[1]] = dis[u[0]][u[1]] + w;
                if (!ins[v[0]][v[1]]) {
                    ins[v[0]][v[1]] = true;
                    q.push(v);
                }
            }
        }
    }
    return dis;
}

function spfaPath(terrain: string[][], x: number, y: number): [number[][], number[][]] {
    let dis = createMatrix(51, 51, INF);
    let ins = createMatrix(51, 51, false);
    let fa = createMatrix(51, 51, -1);
    let q = new Queue<[number, number]>();
    q.push([x, y]);
    dis[x][y] = 0;
    ins[x][y] = true;
    while (!q.empty()) {
        let u = q.pop();
        ins[u[0]][u[1]] = false;
        for (let i = 0; i < 8; i++) {
            let v: [number, number] = [u[0] + dx[i], u[1] + dy[i]];
            if (v[0] < 0 || v[0] >= 50 || v[1] < 0 || v[1] >= 50) continue;
            if (terrain[v[0]][v[1]] != ' ' && terrain[v[0]][v[1]] != 'r') continue;
            if (dis[u[0]][u[1]] + 1 < dis[v[0]][v[1]]) {
                dis[v[0]][v[1]] = dis[u[0]][u[1]] + 1;
                fa[v[0]][v[1]] = posToId(u[0], u[1]);
                if (!ins[v[0]][v[1]]) {
                    ins[v[0]][v[1]] = true;
                    q.push(v);
                }
            }
        }
    }
    return [fa, dis];
}

// 找出房间中距离 source, controller, deposit 距离之和最小的点
function getRoomCenter(room: Room): RoomPosition {
    let dis = createMatrix(51, 51, 0);
    const terrain = room.getTerrain();
    let points = new Array<RoomPosition>();
    room.find(FIND_SOURCES).forEach((s) => points.push(s.pos));
    room.find(FIND_MINERALS).forEach((s) => points.push(s.pos));
    if (room.controller) points.push(room.controller.pos);
    points.forEach((pos) => {
        let t = spfaDisMap(terrain, pos.x, pos.y);
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
    return new RoomPosition(minx, miny, room.name);
}

export const StructureMapping: { [s: string]: BuildableStructureConstant } = {
    'e': STRUCTURE_EXTENSION,
    'r': STRUCTURE_ROAD,
    's': STRUCTURE_SPAWN,
    'S': STRUCTURE_STORAGE,
    't': STRUCTURE_TOWER,
    'T': STRUCTURE_TERMINAL,
    'R': STRUCTURE_RAMPART,
    'l': STRUCTURE_LAB,
    'L': STRUCTURE_LINK,
    'p': STRUCTURE_POWER_SPAWN,
    'w': STRUCTURE_WALL,
    'n': STRUCTURE_NUKER,
    'o': STRUCTURE_OBSERVER,
    'f': STRUCTURE_FACTORY
}

const largeCenter = [
    "  rrrrtrrrr  ",
    " reeeere llr ",
    "rereeerellrlr",
    "reereerelrllr",
    "reeerrerrll r",
    "reetrrLnrseer",
    "trrreSrTerrrt",
    "reesrpsfrteer",
    "reeerrerreeer",
    "reereereereer",
    "rereeereeerer",
    " reeeereeeer ",
    "  rrrrtrrrr  "
];

const smallCenter = [
    "fpTtrt",
    "nrsrsr",
    "SLrllt",
    "trlrll",
    "rsllrl",
    "trtllr"
]

function fillOutPoints(res: string[][], room: Room, design: RoomDesign) {
    function setObj(x: number, y: number, type: string): [number, number] {
        for (let i = 0; i < 8; i++) {
            let creepx = x + dx[i];
            let creepy = y + dy[i];
            if (creepx < 0 || creepx >= 50 || creepy < 0 || creepy >= 50) continue;
            if (res[creepx][creepy] != ' ') continue;
            for (let j = 0; j < 8; j++) {
                let lx = creepx + dx[i];
                let ly = creepy + dy[i];
                if (lx < 0 || lx >= 50 || ly < 0 || ly >= 50) continue;
                if (res[lx][ly] != ' ') continue;
                if (Math.abs(lx - x) == 2 || Math.abs(ly - y) == 2) {
                    res[lx][ly] = type;
                    return [lx, ly];
                }
            }
        }
        return [0, 0];
    }
    if (room.controller) {
        design.links.controllerLink = setObj(room.controller.pos.x, room.controller.pos.y, 'L');
        setObj(room.controller.pos.x, room.controller.pos.y, 'o');
    }
    const sources = room.find(FIND_SOURCES);
    design.links.sourceLink = [];
    for (let i = 0; i < sources.length; i++) {
        design.links.sourceLink[i] = setObj(sources[i].pos.x, sources[i].pos.y, 'L');
    }
}

type Route = [number, number][];
function fillRoutes(res: string[][], room: Room, design: RoomDesign): Route[] {
    const sx = design.center.x;
    const sy = design.center.y;
    const sid = posToId(sx, sy);
    let [fa, dis] = spfaPath(res, sx, sy);
    function fillRoute(x: number, y: number): Route {
        let route: Route = [];
        let mindis = INF;
        let nx = x, ny = y;
        for (let i = 0; i < 8; i++) {
            if (dis[x + dx[i]][y + dy[i]] < mindis) {
                nx = x + dx[i];
                ny = y + dy[i];
                mindis = dis[nx][ny];
            }
        }
        if (dis[nx][ny] == INF) return [];
        let cur = posToId(nx, ny);
        while (fa[nx][ny] != sid) {
            res[nx][ny] = 'r';
            route.push([nx, ny]);
            cur = fa[nx][ny];
            [nx, ny] = idToPos(cur);
        }
        return route;
    }
    let routes: Route[] = [];
    if (room.controller) routes.push(fillRoute(room.controller.pos.x, room.controller.pos.y));
    room.find(FIND_MINERALS).forEach((s) => routes.push(fillRoute(s.pos.x, s.pos.y)));
    room.find(FIND_SOURCES).forEach((s) => routes.push(fillRoute(s.pos.x, s.pos.y)));
    return routes;
}

function fillExtensions(res: string[][], room: Room, design: RoomDesign) {
    let dis = createMatrix(51, 51, INF);
    let ins = createMatrix(51, 51, false);
    let q = new Queue<[number, number]>();
    const x = design.center.x;
    const y = design.center.y;
    let count = 0;
    q.push([x, y]);
    dis[x][y] = 0;
    ins[x][y] = true;
    while (!q.empty()) {
        let u = q.pop();
        ins[u[0]][u[1]] = false;
        for (let i = 0; i < 8; i++) {
            let v: [number, number] = [u[0] + dx[i], u[1] + dy[i]];
            if (v[0] < 3 || v[0] >= 47 || v[1] < 3 || v[1] >= 47) continue;
            if (res[v[0]][v[1]] == ' ') {
                res[v[0]][v[1]] = ((v[0] + v[1]) & 1) ? 'e' : 'r';
                if (res[v[0]][v[1]] == 'e') {
                    count++;
                    if (count >= 60) return;
                }
            }
            if (res[v[0]][v[1]] != 'r') continue;
            if (dis[u[0]][u[1]] + 1 < dis[v[0]][v[1]]) {
                dis[v[0]][v[1]] = dis[u[0]][u[1]] + 1;
                if (!ins[v[0]][v[1]]) {
                    ins[v[0]][v[1]] = true;
                    q.push(v);
                }
            }
        }
    }
}

function createBuildStages(res: string[][], room: Room, design: RoomDesign, routes: Route[]) {
    let ins = createMatrix(51, 51, false);
    let structPos: { [type: string]: [number, number][] } = {};
    let nroutes: { type: STRUCTURE_ROAD, x: number, y: number }[][] = [];
    for (let i = 0; i < routes.length; i++) {
        nroutes[i] = [];
        routes[i].forEach(p => {
            if (!ins[p[0]][p[1]]) {
                ins[p[0]][p[1]] = true;
                nroutes[i].push({ type: STRUCTURE_ROAD, x: p[0], y: p[1] });
            }
        })
    }
    for (let i = 0; i < 50; i++) {
        for (let j = 0; j < 50; j++) {
            if (ins[i][j] || res[i][j] == ' ' || res[i][j] == '.') continue;
            structPos[StructureMapping[res[i][j]]] = structPos[StructureMapping[res[i][j]]] || [];
            structPos[StructureMapping[res[i][j]]].push([i, j]);
        }
    }
    function take(type: BuildableStructureConstant, count: number) {
        let res: { type: BuildableStructureConstant, x: number, y: number }[] = [];
        while (count > 0) {
            count--;
            const cur = structPos[type].pop();
            if (!cur) { console.log(`Internal design error: need too many ${type}`); continue; }
            res.push({ type: type, x: cur[0], y: cur[1] });
        }
        return res;
    }

    design.currentStage = 0;
    design.stages = [];
    design.stages.push({ rcl: 1, list: take("spawn", 1) });
    design.stages.push({ rcl: 2, list: take("road", 5) });
    design.stages.push({ rcl: 3, list: take("extension", 5).concat(take("tower", 1)) });
    design.stages.push({ rcl: 4, list: take("extension", 10).concat(take("storage", 1)) });
    nroutes.forEach((r) => design.stages.push({ rcl: 4, list: r }));
    design.stages.push({
        rcl: 5, list: take("extension", 10).concat([
            { type: "link", x: design.links.sourceLink[0][0], y: design.links.sourceLink[0][1] },
            { type: "link", x: design.links.controllerLink[0], y: design.links.controllerLink[1] }
        ], take("tower", 1))
    });
    design.stages.push({ rcl: 5, list: take("road", structPos["road"].length) });
    design.stages.push({ rcl: 6, list: take("extension", 10).concat(take("lab", 3)) });
    if (design.links.sourceLink[1])
        _.last(design.stages).list.push(
            { type: "link", x: design.links.sourceLink[1][0], y: design.links.sourceLink[1][1] });
    let mineral = room.find(FIND_MINERALS)[0].pos;
    _.last(design.stages).list.push({ type: "extractor", x: mineral.x, y: mineral.y });
    design.stages.push({
        rcl: 7, list: take("extension", 10).concat(take("lab", 3), take("tower", 1), [
            { type: "link", x: design.links.centerLink[0], y: design.links.centerLink[1] }
        ])
    });
    design.stages.push({ rcl: 8, list: take("extension", 10).concat(take("lab", 4), take("tower", 3), take("observer", 1)) });
    design.stages.push({ rcl: 8, list: take("nuker", 1).concat(take("terminal", 1), take("factory", 1), take("powerSpawn", 1)) });
}

export function designRoom(room: Room): RoomDesign {
    let res = new Array<Array<string>>(51);
    const terrain = room.getTerrain();
    let wlen = createMatrix(51, 51, 0);
    for (let i = 0; i < 50; i++) {
        res[i] = new Array<string>(51);
        for (let j = 0; j < 50; j++) {
            if (terrain.get(i, j) == TERRAIN_MASK_WALL) {
                res[i][j] = '.';
                wlen[i][j] = 0;
            } else {
                res[i][j] = ' ';
                wlen[i][j] = (j == 0) ? 1 : (wlen[i][j - 1] + 1);
            }
        }
    }

    const center = getRoomCenter(room);

    function findSquare(size: number): [number, number, number] {
        let resx = 0, resy = 0, resdis = INF;
        for (let j = 0; j < 50; j++) {
            let curlen = 0;
            for (let i = 0; i < 50; i++) {
                if (wlen[i][j] >= size) {
                    curlen++;
                } else {
                    curlen = 0;
                }
                if (curlen >= size) {
                    const dis = Math.abs(i - size / 2 - center.x) + Math.abs(j - size / 2 - center.y);
                    if (dis < resdis) {
                        resdis = dis;
                        resx = i - size + 1;
                        resy = j - size + 1;
                    }
                }
            }
        }
        // console.log(`findSquare Result: ${[resx, resy, resdis]}`)
        return [resx, resy, resdis];
    }

    function fillSquare(s: string[], t: string[][], sx: number, sy: number, size: number): void {
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                if (s[i][j] == ' ') continue;
                t[sx + i][sy + j] = s[i][j];
            }
        }
    }

    let design = {
        links: {}
    } as RoomDesign;

    const largeres = findSquare(13);
    let isSmall = false;
    if (largeres[2] <= 10) {
        fillSquare(largeCenter, res, largeres[0], largeres[1], largeCenter.length);
        design.center = new RoomPosition(largeres[0] + 6, largeres[1] + 6, room.name);
        design.links.centerLink = [largeres[0] + 5, largeres[1] + 6];
    } else {
        const smallRes = findSquare(6);
        if (smallRes[2] == INF) {
            console.log(`Can't design room ${room.name}.`);
            return {} as RoomDesign;
        }
        isSmall = true;
        fillSquare(smallCenter, res, smallRes[0], smallRes[1], smallCenter.length);
        design.center = new RoomPosition(smallRes[0] + 1, smallRes[1] + 1, room.name);
        design.links.centerLink = [smallRes[0] + 2, smallRes[0] + 1];
    }

    fillOutPoints(res, room, design);
    let routes = fillRoutes(res, room, design);
    if (isSmall) fillExtensions(res, room, design);

    createBuildStages(res, room, design, routes);

    let mat: string[] = []
    for (let i = 0; i < 50; i++) {
        mat[i] = "";
        for (let j = 0; j < 50; j++) {
            mat[i] += res[i][j];
        }
    }
    design.matrix = mat;

    return design;
}
