export let costMatrixCache: {
    [room: string]: {
        data: CostMatrix,
        needUpdate?: boolean
    }
} = {};

let currentCostMatrixCache: { [room: string]: CostMatrix }

let creepMoveRequests: {
    [name: string]: RoomPosition
}

function createBaseCostMatrixCache(room: string): CostMatrix {
    let terrain = Game.map.getRoomTerrain(room);
    let matrix = new PathFinder.CostMatrix();
    for (let i = 0; i < 50; i++) {
        for (let j = 0; j < 50; j++) {
            switch (terrain.get(i, j)) {
                case TERRAIN_MASK_WALL:
                    matrix.set(i, j, 0xff);
                    break;
                case TERRAIN_MASK_SWAMP:
                    matrix.set(i, j, 10);
                    break;
                default:
                    matrix.set(i, j, 2);
                    break;
            }
        }
    }
    return matrix;
}

function isStrucureWalkable(s: Structure) {
    return s.structureType == STRUCTURE_CONTAINER || s.structureType == STRUCTURE_RAMPART && (s as StructureRampart).my;
}

function fillFullCostMatrixCache(room: Room, matrix: CostMatrix) {
    let structs = room.find(FIND_STRUCTURES);
    structs.forEach(s => {
        if (s.structureType == STRUCTURE_ROAD) {
            matrix.set(s.pos.x, s.pos.y, 1);
        } else if (!isStrucureWalkable(s)) {
            matrix.set(s.pos.x, s.pos.y, 0xff);
        }
    })
}

function fillCostMatrixWithCreeps(room: Room, matrix: CostMatrix) {
    let creeps = room.find(FIND_CREEPS);
    creeps.forEach(c => {
        if (c.my && !creepMoveRequests[c.name]) {
            matrix.set(c.pos.x, c.pos.y, 0xff);
        }
    })
}

function getRoomCostMatrix(room: string): CostMatrix {
    if (currentCostMatrixCache[room]) return currentCostMatrixCache[room];
    if (!costMatrixCache[room] || costMatrixCache[room].needUpdate && Game.rooms[room]) {
        costMatrixCache[room] = { data: createBaseCostMatrixCache(room) }
        if (Game.rooms[room]) {
            fillFullCostMatrixCache(Game.rooms[room], costMatrixCache[room].data);
            costMatrixCache[room].needUpdate = false;
        } else {
            costMatrixCache[room].needUpdate = true;
        }
    }
    currentCostMatrixCache[room] = costMatrixCache[room].data.clone();
    if (Game.rooms[room]) {
        fillCostMatrixWithCreeps(Game.rooms[room], currentCostMatrixCache[room]);
    }
    return currentCostMatrixCache[room];
}

export function prepareMoveHelper() {
    currentCostMatrixCache = {};
    creepMoveRequests = {}
}

function isEqualPosition(a: { x: number, y: number, roomName: string }, b: { x: number, y: number, roomName: string }) {
    return a.x == b.x && a.y == b.y && a.roomName == b.roomName;
}

export function moveCreepTo(creep: Creep, pos: RoomPosition | { pos: RoomPosition }) {
    // creep.moveTo(pos, {
    //     reusePath: 10,
    // });
    if (!(pos instanceof RoomPosition)) pos = pos.pos;
    creepMoveRequests[creep.name] = pos;
}

export function tickMoveHelper() {
    _.forIn(creepMoveRequests, (pos, name) => {
        const creep = Game.creeps[name];
        // if (creep.fatigue) return;
        // let path: PathStep[];
        // function doFindPath() {
        //     path = creep.pos.findPathTo(pos, {
        //         range: 1,
        //         costCallback: getRoomCostMatrix
        //     })
        //     creep.memory.moveData = {
        //         target: { x: pos.x, y: pos.y, roomName: pos.roomName },
        //         path: Room.serializePath(path),
        //         pathRoom: creep.room.name
        //     };
        // }
        // if (!creep.memory.moveData
        //     || !isEqualPosition(creep.memory.moveData.target, pos)
        //     || creep.room.name != creep.memory.moveData.pathRoom) {
        //     doFindPath();
        // } else {
        //     path = Room.deserializePath(creep.memory.moveData.path);
        // }

        creep.moveTo(pos, {
            reusePath: 30,
            costCallback: getRoomCostMatrix
        });
    })
}

interface ExitingCreepMemory extends CreepMemory {
    _exitInfo: { target: string, x: number, y: number, room: string }
}

export function moveCreepToRoom(creep: Creep, room: string) {
    let m = creep.memory as ExitingCreepMemory;
    if (!m._exitInfo || m._exitInfo.target != room || m._exitInfo.room != creep.room.name) {
        const dir = creep.room.findExitTo(room) as ExitConstant;
        let exit = creep.pos.findClosestByPath(dir);
        m._exitInfo = { target: room, room: creep.room.name, x: exit.x, y: exit.y };
    }
    moveCreepTo(creep, new RoomPosition(m._exitInfo.x, m._exitInfo.y, creep.room.name));
}
