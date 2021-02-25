import cfg from "config";
import { pushConstructQueue } from "room/construction";
import { myRooms, registerRoomRoutine, RoomInfo } from "room/roomInfo";
import { RMManager } from "utils";
import { registerCommand } from "utils/console";

function fetchWallTask(room: RoomInfo) {
    RMManager.read(room.design.detailSegment, (segment: Record<string, RoomDesignDetail>) => {
        let detail = segment[room.name];
        if (room.wallBuildRequest.size > 0) {
            return;
        }
        let repairQueue: (StructureWall | StructureRampart)[] = [];
        if (detail.walls && room.state.energy.usage.builder) {
            detail.walls.forEach(p => {
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
        if (detail.ramparts) {
            detail.ramparts.forEach(p => {
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
            repairQueue = _.sortBy(repairQueue, r => r.hits);
            let maxHits = repairQueue[0].hits + cfg.WALL_BUILD_STEP * 2;
            room.wallHits = repairQueue[0].hits;
            for (const st of repairQueue) {
                if (st.hits > maxHits) break;
                room.wallBuildRequest.set(st.id, cfg.WALL_BUILD_STEP);
            }
        }
    })
}
registerRoomRoutine({
    id: "fetchWall",
    init: fetchWallTask,
    invoke: fetchWallTask,
});

registerCommand('recordWall',
    `Record wall design in a room.
Put construction sites of walls or ramparts first, then call the command to save the design.
You can specialize the range to avoid recording unecessary walls.`,
    [
        { name: "room", type: "myRoom" },
        { name: "x1", type: "coord" },
        { name: "y1", type: "coord" },
        { name: "x2", type: "coord" },
        { name: "y2", type: "coord" },
    ],
    (roomName: string, x1 = 0, y1 = 0, x2 = 49, y2 = 49) => {
        let room = myRooms[roomName];
        RMManager.readWrite(room.design.detailSegment, (segment: Record<string, RoomDesignDetail>) => {
            let detail = segment[room.name];
            detail.walls = [];
            detail.ramparts = [];
            room.detail.lookForAtArea("structure", y1, x1, y2, x2, true).forEach(
                st => {
                    switch (st.structure.structureType) {
                        case STRUCTURE_RAMPART:
                            detail.ramparts.push({ x: st.x, y: st.y });
                            break;
                        case STRUCTURE_WALL:
                            detail.walls.push({ x: st.x, y: st.y });
                            break;
                    };
                }
            )
            room.detail.lookForAtArea("constructionSite", y1, x1, y2, x2, true).forEach(
                st => {
                    switch (st.constructionSite.structureType) {
                        case STRUCTURE_RAMPART:
                            detail.ramparts.push({ x: st.x, y: st.y });
                            break;
                        case STRUCTURE_WALL:
                            detail.walls.push({ x: st.x, y: st.y });
                            break;
                    };
                }
            )
            let stobj = room.structures;
            _.compact([stobj.powerSpawn, stobj.storage, stobj.terminal, stobj.factory, stobj.nuker,
            ...stobj.spawns, ...stobj.towers, ...stobj.labs.input, ...stobj.labs.output, ...stobj.links])
                .forEach(st => {
                    detail.ramparts.push({ x: st.pos.x, y: st.pos.y });
                });
            room.delay("fetchWall", 1);
        });
    })
