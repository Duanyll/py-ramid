import { STATS_SEGMENT, STATS_SUMMARY_TIME } from "config";
import { onSegment } from "rawMemory";
import { myRooms, RoomInfo } from "roomInfo";

interface RoomStats {
    rcl: number,
    rclProgress: number,
    rclTotal: number,
    rclPercentage: number,
    energyStore: number,
    creepCount: number
}

interface Stats {
    gcl: {
        level: number,
        progress: number,
        progressTotal: number,
        progressPercentage: number
    },
    cpu: {
        current: number,
        bucket: number
    },
    rooms: { [name: string]: RoomStats }
}

function summaryRoom(room: RoomInfo): RoomStats {
    return {
        rcl: room.detail.controller.level,
        rclTotal: room.detail.controller.progressTotal,
        rclProgress: room.detail.controller.progress,
        rclPercentage: room.detail.controller.progress / room.detail.controller.progressTotal,
        energyStore: room.structures.storage?.store.energy,
        creepCount: room.creeps.length
    };
}

export function summaryStats() {
    if (Game.time % STATS_SUMMARY_TIME == 0) onSegment(STATS_SEGMENT, () => {
        let obj: Stats = {
            gcl: {
                level: Game.gcl.level,
                progress: Game.gcl.progress,
                progressTotal: Game.gcl.progressTotal,
                progressPercentage: Game.gcl.progress / Game.gcl.progressTotal
            },
            cpu: {
                current: Game.cpu.getUsed(),
                bucket: Game.cpu.bucket
            },
            rooms: _.mapValues(myRooms, summaryRoom)
        }
        RawMemory.segments[STATS_SEGMENT] = JSON.stringify(obj);
    });
}
