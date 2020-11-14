import { STATS_SEGMENT, STATS_SUMMARY_TIME } from "config";
import { onSegment } from "rawMemory";
import { myRooms, RoomInfo } from "roomInfo";
import { globalDelay, registerGlobalRoutine } from "scheduler";

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
    rooms: { [name: string]: RoomStats },
    time: number
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
    onSegment(STATS_SEGMENT, () => {
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
            rooms: _.mapValues(myRooms, summaryRoom),
            time: Game.time
        }
        RawMemory.segments[STATS_SEGMENT] = JSON.stringify(obj);
    });
    globalDelay("summatyStats", STATS_SUMMARY_TIME);
}
registerGlobalRoutine("summatyStats", summaryStats);
