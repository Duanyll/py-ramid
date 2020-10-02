import { STATS_SEGMENT, STATS_SUMMARY_TIME } from "config";
import { wrapSegmentRequest } from "rawMemory";
import { managedRooms, RoomInfo } from "roomInfo";

function summaryRoom(room: RoomInfo): RoomStats {
    return {
        rcl: room.detail.controller.level,
        rclTotal: room.detail.controller.progressTotal,
        rclProgress: room.detail.controller.progress,
        energyStore: room.structures.storage?.store.energy,
        creepCount: room.creeps.length
    };
}

export function summaryStats() {
    if (Game.time % STATS_SUMMARY_TIME == 0) wrapSegmentRequest(STATS_SEGMENT, () => {
        let obj: Stats = {
            gcl: {
                level: Game.gcl.level,
                progress: Game.gcl.progress,
                progressTotal: Game.gcl.progressTotal
            },
            cpu: {
                current: Game.cpu.getUsed(),
                bucket: Game.cpu.bucket
            },
            rooms: _.mapValues(managedRooms, summaryRoom)
        }
        RawMemory.segments[STATS_SEGMENT] = JSON.stringify(obj);
    });
}
