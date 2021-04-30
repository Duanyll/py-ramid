import { RoomInfo, registerRoomRoutine } from "room/roomInfo";
import Logger from "utils";
import Storage from "utils/rawMemory";

interface ConstructionRequest {
    pos: RoomPosition;
    type: BuildableStructureConstant;
    name?: string;
}
function consReqToString(req: ConstructionRequest) {
    return `${req.pos.roomName}-${req.pos.x}-${req.pos.y}-${req.type}`;
}
let constructionQueue: ConstructionRequest[] = [];
let constructionQueueLock = new Set<string>();

export function pushConstructQueue(req: ConstructionRequest) {
    if (!constructionQueueLock.has(consReqToString(req))) {
        constructionQueueLock.add(consReqToString(req));
        constructionQueue.push(req);
    }
}

export function onSRCLUpgrade(room: RoomInfo) {
    if (room.structRcl >= 5) room.setTimeout("runLinks", 1);
    if (room.structRcl >= 6) room.state.enableMining = true;
    if (room.structures.nuker) room.state.chargeNuker = true;
}

export function setConstruction(room: RoomInfo, full?: boolean) {
    Storage.getSegment(room.design.detailSegment, (segment: Record<string, RoomDesignDetail>) => {
        const stage = room.design.currentStage;
        const stages = segment[room.name].stages;
        if (full) {
            for (let i = 1; i < stage; i++) {
                const list = stages[i].list;
                list.forEach(s => {
                    if (!(_.find(room.detail.lookForAt(LOOK_STRUCTURES, s.x, s.y), st => st.structureType == s.type)
                        || _.find(room.detail.lookForAt(LOOK_CONSTRUCTION_SITES, s.x, s.y), c => c.structureType == s.type))) {
                        pushConstructQueue({ pos: new RoomPosition(s.x, s.y, room.name), type: s.type, name: s.name });
                    }
                })
            }
        }
        let nextStage = true;
        if (!stages[stage]) return;
        if (stages[stage].rcl > room.structures.controller.level) return;
        stages[stage].list.forEach(s => {
            if (!_.find(room.detail.lookForAt(LOOK_STRUCTURES, s.x, s.y), st => st.structureType == s.type)) {
                nextStage = false;
                if (!_.find(room.detail.lookForAt(LOOK_CONSTRUCTION_SITES, s.x, s.y), c => c.structureType == s.type)) {
                    if (s.type != STRUCTURE_WALL) {
                        let wall = _.find(room.detail.lookForAt(LOOK_STRUCTURES, s.x, s.y),
                            st => st.structureType == STRUCTURE_WALL) as StructureWall;
                        if (wall) wall.destroy();
                    }
                    pushConstructQueue({ pos: new RoomPosition(s.x, s.y, room.name), type: s.type, name: s.name });
                }
            }
        });
        if (nextStage) {
            Logger.report(`Room ${room.name}: Construction stage ${room.design.currentStage} compelete.`);
            room.design.rclDone = stages[stage].rcl;
            room.design.currentStage++;
            onSRCLUpgrade(room);
            room.setTimeout("setConstruction", 1);
        } else {
            room.setTimeout("setConstruction");
        }

        return false;
    })
}
registerRoomRoutine({
    id: "setConstruction",
    init: (room) => setConstruction(room, true),
    invoke: setConstruction,
});

export function tickConstruction() {
    let remain = MAX_CONSTRUCTION_SITES - _.size(Game.constructionSites);
    while (remain > 0 && constructionQueue.length > 0) {
        let req = constructionQueue.shift();
        req.pos.createConstructionSite(req.type as any, req.name);
        constructionQueueLock.delete(consReqToString(req));
    }
}
