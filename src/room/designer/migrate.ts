import cfg from "config";
import Logger, { RMManager } from "utils";
import { RoomDesignOld } from "./classic";


function getSegment(roomName: string) {
    const existSegment = _.find(cfg.SEGMENTS.roomDesign, id => _.includes(Memory.rawMemoryIndex[id], roomName));
    if (existSegment) return existSegment;
    const newSegment = _.find(cfg.SEGMENTS.roomDesign, id => _.size(Memory.rawMemoryIndex[id]) < 5);
    Memory.rawMemoryIndex[newSegment] ||= [];
    Memory.rawMemoryIndex[newSegment].push(roomName);
    return newSegment;
}

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
    let segmentId = getSegment(roomName);
    Logger.debug(`Requested to migerate room design in ${roomName}`)
    RMManager.readWrite(segmentId, (segment: Record<string, RoomDesignDetail>) => {
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
        return segment;
    });
}
