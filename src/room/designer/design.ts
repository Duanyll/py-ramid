import Logger from "utils";
import { fillExtensions, fillOutPoints, fillSquare } from "./fill";
import { getRelativeRoomCenter, getRoutes } from "./pathFinding";
import { SquareFinder } from "./squareFinder";
import { createBuildStages } from "./stages";

export const largeCenter = [
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

export const smallCenter = [
    "fpTtrt",
    "nrsrsr",
    "SLrllt",
    "trlrll",
    "rsllrl",
    "trtllr"
]

export function designRoom(room: Room): [RoomDesign, RoomDesignDetail] {
    let cpuBefore = Game.cpu.getUsed();
    let matrix = new Array<Array<string>>(51);
    const terrain = room.getTerrain();
    for (let i = 0; i < 50; i++) {
        matrix[i] = new Array<string>(51);
        for (let j = 0; j < 50; j++) {
            if (terrain.get(i, j) == TERRAIN_MASK_WALL) {
                matrix[i][j] = '.';
            } else if (terrain.get(i, j) == TERRAIN_MASK_SWAMP) {
                matrix[i][j] = '~';
            } else {
                matrix[i][j] = ' ';
            }
        }
    }

    let rcenter: PointInRoom;
    let fixedCenter = false;
    let spawn = room.find(FIND_MY_SPAWNS)[0]
        || room.find(FIND_MY_CONSTRUCTION_SITES).filter(s => s.structureType == STRUCTURE_SPAWN)[0];
    if (spawn) {
        Logger.debug("Designing room with spawn at specific position.");
        fixedCenter = true;
        rcenter = { x: spawn.pos.x, y: spawn.pos.y - 1 };
    } else {
        rcenter = getRelativeRoomCenter(matrix, [
            room.controller,
            ...room.find(FIND_SOURCES),
            ...room.find(FIND_MINERALS)
        ].map(s => s.pos));
    }

    let design = {
        version: 3,
        link: {},
        lab: {}
    } as RoomDesign;
    let detail = {
        version: 1,
        walls: [],
        ramparts: []
    } as RoomDesignDetail;

    let isSmall = false;
    if (fixedCenter) {
        isSmall = true;
        fillSquare(smallCenter, matrix, rcenter.x - 1, rcenter.y - 1, smallCenter.length);
        design.center = rcenter;
        design.link.center = { x: rcenter.x + 1, y: rcenter.y };
        design.centerSpawn = { x: rcenter.x, y: rcenter.y + 1 };
    } else {
        let finder = new SquareFinder(matrix);
        let res = finder.find(13, rcenter);
        if (res && res.dis <= 20) {
            fillSquare(largeCenter, matrix, res.x, res.y, 13);
            design.center = { x: res.x + 6, y: res.y + 6 };
            design.link.center = { x: res.x + 5, y: res.y + 6 };
            design.centerSpawn = { x: res.x + 7, y: res.y + 6 };
        } else {
            res = finder.find(6, rcenter);
            if (!res) {
                Logger.error(`Can't design room ${room.name}.`);
                return;
            }
            isSmall = true;
            fillSquare(smallCenter, matrix, res.x, res.y, 6);
            design.center = { x: res.x + 1, y: res.y + 1 };
            design.link.center = { x: res.x + 2, y: res.y + 1 };
            design.centerSpawn = { x: res.x + 1, y: res.y + 2 };
        }
    }

    fillOutPoints(matrix, room, design);
    let routes = getRoutes(matrix, design.center, [
        room.controller,
        ...room.find(FIND_SOURCES),
        ...room.find(FIND_MINERALS)
    ].map(s => s.pos));
    if (isSmall) fillExtensions(matrix, design.center);

    createBuildStages(matrix, room, design, detail, routes);

    let mat: string[] = []
    for (let i = 0; i < 50; i++) {
        mat[i] = "";
        for (let j = 0; j < 50; j++) {
            mat[i] += matrix[j][i];
        }
    }
    detail.matrix = mat;
    design.source = room.find(FIND_SOURCES).map(s => { return { x: s.pos.x, y: s.pos.y } });

    Logger.report(`Designing room ${room.name} took ${Game.cpu.getUsed() - cpuBefore} CPU.`);
    return [design, detail];
}
