import { myRooms, RoomInfo } from "room/roomInfo";
import { globalDelay, registerGlobalRoutine, RMManager } from "utils";
import cfg from "config";

interface RoomStats {
    rcl: number,
    rclProgress: number,
    rclTotal: number,
    rclPercentage: number,
    energyStore: number,
    creepCount: number,
    wallHits: number,
    // lab: string
}

interface Stats {
    gcl: {
        level: number,
        progress: number,
        progressTotal: number,
        progressPercentage: number
    },
    gpl: {
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
    resource: Partial<Record<ResourceConstant, number>>,
    time: number,
    credits: number,
    labRunningCount: number
}

function reportLab(room: RoomInfo) {
    let res = room.name + ": ";
    if (room.state.lab.remain) {
        res += `${room.state.lab.remain} * ${room.state.lab.product} `
    }
    if (room.state.lab.boost.length) {
        res += `boost: [${room.state.lab.boost.join(',')}]`;
    }
    return res;
}

function summaryRoom(room: RoomInfo): RoomStats {
    return {
        rcl: room.detail.controller.level,
        rclTotal: room.detail.controller.progressTotal,
        rclProgress: room.detail.controller.progress,
        rclPercentage: room.detail.controller.progress / room.detail.controller.progressTotal,
        energyStore: room.structures.storage?.store.energy,
        creepCount: room.creeps.length,
        wallHits: room.wallHits,
        // lab: reportLab(room)
    };
}

function summaryResource(): Partial<Record<ResourceConstant, number>> {
    let res: Partial<Record<ResourceConstant, number>> = {};
    (["XUH2O", "XKH2O", "XKHO2", "XLH2O", "XLHO2", "XZH2O", "XZHO2", "XGHO2", "G", "power"] as ResourceConstant[])
        .forEach(r => {
            res[r] = global.store.current.get(r);
        })
    return res;
}

export function summaryStats() {
    RMManager.write(cfg.SEGMENTS.stats, () => {
        let obj: Stats = {
            gcl: {
                level: Game.gcl.level,
                progress: Game.gcl.progress,
                progressTotal: Game.gcl.progressTotal,
                progressPercentage: Game.gcl.progress / Game.gcl.progressTotal
            },
            gpl: {
                level: Game.gpl.level,
                progress: Game.gpl.progress,
                progressTotal: Game.gpl.progressTotal,
                progressPercentage: Game.gpl.progress / Game.gpl.progressTotal
            },
            cpu: {
                current: Game.cpu.getUsed(),
                bucket: Game.cpu.bucket
            },
            rooms: _.mapValues(myRooms, summaryRoom),
            time: Game.time,
            resource: summaryResource(),
            credits: Game.market.credits,
            labRunningCount: _.reduce(myRooms, (cnt, room) => cnt += room.labRunning ? 1 : 0, 0)
        }
        return obj;
    });
    globalDelay("summaryStats");
}
registerGlobalRoutine("summaryStats", summaryStats);
