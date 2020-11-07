import { WALL_BUILD_STEP } from "config";
import { pushConstructQueue } from "construction";
import { myRooms, registerCallback, RoomInfo } from "roomInfo";

function fetchWallTask(room: RoomInfo) {
    if (room.wallBuildQueue.length > 0) {
        room.delay("fetchWall", 5000);
        return;
    }
    let repairQueue: (StructureWall | StructureRampart)[] = [];
    if (room.design.walls && room.state.energyMode == "wall") {
        room.design.walls.forEach(p => {
            let wall = room.detail.lookForAt(LOOK_STRUCTURES, p.x, p.y)
                .find(s => s.structureType == STRUCTURE_WALL) as StructureWall;
            if (wall) {
                repairQueue.push(wall);
            } else {
                if (!room.detail.lookForAt(LOOK_CONSTRUCTION_SITES, p.x, p.y)
                    .find(c => c.structureType == STRUCTURE_WALL))
                    pushConstructQueue({ pos: new RoomPosition(p.x, p.y, room.name), type: STRUCTURE_WALL });
            }
        })
    }
    if (room.design.ramparts) {
        room.design.ramparts.forEach(p => {
            let rampart = room.detail.lookForAt(LOOK_STRUCTURES, p.x, p.y)
                .find(s => s.structureType == STRUCTURE_RAMPART) as StructureRampart;
            if (rampart) {
                repairQueue.push(rampart);
            } else {
                if (!room.detail.lookForAt(LOOK_CONSTRUCTION_SITES, p.x, p.y)
                    .find(c => c.structureType == STRUCTURE_RAMPART))
                    pushConstructQueue({ pos: new RoomPosition(p.x, p.y, room.name), type: STRUCTURE_RAMPART });
            }
        })
    }
    if (repairQueue.length > 0) {
        repairQueue = _.sortBy(repairQueue, 'hits');
        let maxHits = repairQueue[0].hits + WALL_BUILD_STEP * 2;
        for (const st of repairQueue) {
            if (st.hits > maxHits) break;
            room.wallBuildQueue.push({ id: st.id, hitsRemain: WALL_BUILD_STEP });
        }
    }

    room.delay("fetchWall", 5000);
}
registerCallback("fetchWall", fetchWallTask);

global.recordWallDesign = (roomName: string, x1 = 0, y1 = 0, x2 = 49, y2 = 49) => {
    let room = myRooms[roomName];
    room.design.walls = [];
    room.design.ramparts = [];
    room.detail.lookForAtArea("structure", y1, x1, y2, x2, true).forEach(
        st => {
            switch (st.structure.structureType) {
                case STRUCTURE_RAMPART:
                    room.design.ramparts.push({ x: st.x, y: st.y });
                    break;
                case STRUCTURE_WALL:
                    room.design.walls.push({ x: st.x, y: st.y });
                    break;
            };
        }
    )
    room.detail.lookForAtArea("constructionSite", y1, x1, y2, x2, true).forEach(
        st => {
            switch (st.constructionSite.structureType) {
                case STRUCTURE_RAMPART:
                    room.design.ramparts.push({ x: st.x, y: st.y });
                    break;
                case STRUCTURE_WALL:
                    room.design.walls.push({ x: st.x, y: st.y });
                    break;
            };
        }
    )
    let stobj = room.structures;
    _.compact([stobj.powerSpawn, stobj.storage, stobj.terminal, stobj.factory, stobj.nuker,
    ...stobj.spawns, ...stobj.towers, ...stobj.labs, ...stobj.links])
        .forEach(st => {
            room.design.ramparts.push({ x: st.pos.x, y: st.pos.y });
        });
    room.delay("fetchWall", 1);
}
