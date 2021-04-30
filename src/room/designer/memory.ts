import Logger from "utils";
import Storage from "utils/rawMemory";
import { RoomDesignOld } from "./classic";

function createLabInfo(pos: [number, number][]): RoomDesign["lab"] {
    let res: RoomDesign["lab"] = { input: [], output: [] };
    let npos = _.map(pos, i => { return { x: i[0], y: i[1] } });
    npos.forEach(a => {
        if (res.input.length >= 2)
            res.output.push(a);
        else {
            let canBeIn = true;
            npos.forEach(b => {
                if (a.x < b.x - 2 || a.x > b.x + 2 || a.y < b.y - 2 || a.y > b.y + 2) canBeIn = false;
            });
            (canBeIn ? res.input : res.output).push(a);
        }
    });
    return res;
}

export function migrateToRoomDesign2(roomName: string) {
    if (Memory.rooms[roomName].design.version >= 3) return;
    let old = Memory.rooms[roomName].design as any as RoomDesignOld;
    Logger.debug(`Requested to migerate room design in ${roomName}`);
    let segmentId = Storage.where("roomDesign", roomName);
    Storage.getSegment(segmentId, (segment: Record<string, RoomDesignDetail>) => {
        Logger.info(`Migrating room design info in ${roomName}`);
        Memory.rooms[roomName].design = {
            version: 3,
            rclDone: 8,
            currentStage: old.stages.length,
            detailSegment: segmentId,
            center: { x: old.center[0], y: old.center[1] },
            source: _.map(old.sources, i => { return { x: i[0], y: i[1] } }),
            link: {
                source: _.map(old.links.sourceLink, i => { return { x: i[0], y: i[1] } }),
                center: { x: old.links.centerLink[0], y: old.links.centerLink[1] },
                controller: { x: old.links.controllerLink[0], y: old.links.controllerLink[1] }
            },
            centerSpawn: { x: old.centerSpawn[0], y: old.centerSpawn[1] },
            mineralContainer: { x: old.mineralContainer[0], y: old.mineralContainer[1] },
            lab: createLabInfo(old.labs)
        }

        segment[roomName] = {
            version: 1,
            stages: old.stages,
            walls: old.walls,
            ramparts: old.ramparts,
            matrix: old.matrix
        }
        return true;
    });
}


export function saveRoomDesign(roomName: string, [design, detail]: [RoomDesign, RoomDesignDetail]) {
    let segmentId = Storage.where("roomDesign", roomName);
    Storage.getSegment(segmentId, (segment: Record<string, RoomDesignDetail>) => {
        Memory.rooms[roomName] ??= {} as RoomMemory;
        Memory.rooms[roomName].design = design;
        segment[roomName] = detail;
        design.detailSegment = segmentId;
        Logger.info(`Saving design of room ${roomName} to segment #${segmentId}`);
        global.reloadRoomsNextTick = true;
        return true;
    })
}
