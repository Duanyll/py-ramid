import { Queue, Point, createMatrix, printMatrix } from "utils/DataStructure";

const INF = 0x3f3f3f3f;
// 返回从关键点开始 spfa 得到的路程图
const dx = [0, 1, 0, -1, 1, 1, -1, -1];
const dy = [1, 0, -1, 0, 1, -1, -1, 1];
function fillDisMap(terrain: RoomTerrain, x: number, y: number): number[][] {
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

// 找出房间中距离 source, controller, deposit 距离之和最小的点
function getRoomCenter(room: Room): RoomPosition {
    let dis = createMatrix(51, 51, 0);
    const terrain = room.getTerrain();
    let points = new Array<RoomPosition>();
    room.find(FIND_SOURCES).forEach((s) => points.push(s.pos));
    room.find(FIND_MINERALS).forEach((s) => points.push(s.pos));
    if (room.controller) points.push(room.controller.pos);
    points.forEach((pos) => {
        let t = fillDisMap(terrain, pos.x, pos.y);
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

export const StructureMapping = {
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
    "  rrrr rrrr  ",
    " reeeeretllr ",
    "rereeerellrlr",
    "reereerelrllr",
    "reeerrerrlltr",
    "reetrrLnrteer",
    " rrreSrTerrr ",
    "reetrpsfrteer",
    "reeerrerreeer",
    "reereereereer",
    "rereeereeerer",
    " reeeereeeer ",
    "  rrrr rrrr  "
];

const smallCenter = [
    "errre",
    "rrLnr",
    "rSrTr",
    "rpsfr",
    "errre",
];

const smallHatch = [
    "erere",
    "eeree",
    "rrtrr",
    "eeree",
    "erere"
];

const smallLab = [
    " ll ",
    "lrll",
    "llrl",
    " ll "
]

export function getRoomDesign(room: Room): RoomDesign {
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

    const largeres = findSquare(13);
    let realCenter: RoomPosition = center;
    if (largeres[2] <= 10) {
        fillSquare(largeCenter, res, largeres[0], largeres[1], largeCenter.length);
        realCenter = new RoomPosition(largeres[0] + 6, largeres[1] + 6, room.name);
    } else {
        // TODO: 完成对崎岖地形的填充机制
        console.log("Can't plan complexed room at present.");
    }

    let mat: string[] = []
    for (let i = 0; i < 50; i++) {
        mat[i] = "";
        for (let j = 0; j < 50; j++) {
            mat[i] += res[i][j];
        }
    }

    return {
        structures: mat,
        center: realCenter
    }
}

