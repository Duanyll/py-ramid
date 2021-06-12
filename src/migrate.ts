import { migrateToRoomDesign2 } from "room/designer";
import { designRoom } from "room/designer/design";
import { runCommand } from "utils/console";

function migrateLab() {
    Memory.labQueue.forEach((i: any) => {
        const product = REACTIONS[i.recipe[0]][i.recipe[1]];
        i.product = product;
        delete i.recipe;
    })
    _.forIn(Memory.rooms, (room: any) => {
        if (room.state.labRemainAmount > 0) {
            const product = REACTIONS[room.state.labContent[0]][room.state.labContent[1]];
            room.state.lab = {
                boost: [],
                product: product,
                remain: room.state.labRemainAmount
            };
        } else {
            room.state.lab = {
                boost: [],
                remain: 0
            }
        }
        delete room.state.labRemainAmount;
        delete room.state.labMode;
        delete room.state.labContent;
    })
}

function cleanMemory() {
    for (const roomName in Memory.rooms) {
        const mem = Memory.rooms[roomName] as any;
        delete mem.moveQueue;
        delete mem.remoteSources;
        delete mem.state.roleSpawnStatus;
        delete mem.state.refillState;
        delete mem.state.wallHits;
        delete mem.state.roadToRepair;
        delete mem.state.energyState;
        delete mem.state.rampartHits;
        delete mem.state.rampartHitsTarget;
        delete mem.state.energyMode;
        delete mem.state.mineralToTransport;
        delete mem.resource;
    }
    const m = Memory as any;
    delete m.roomsToClaim;
    delete m.mining.power.from;
    for (const res in Memory.market.autoDeal) {
        const mem = Memory.market.autoDeal[res as ResourceConstant] as any;
        delete mem.orders;
    }
    for (const res in Memory.market.autoBuy) {
        const mem = Memory.market.autoBuy[res as ResourceConstant] as any;
        delete mem.orders;
    }
}

export function initMigrate() {
    let operated = false;
    if (_.isEmpty(Memory.rooms)) {
        operated = true;
        Memory.rooms = {};
        Memory.creeps = {};
        for (const roomName in Game.rooms) {
            runCommand("designRoom", roomName, true);
        }
    }

    if (!Memory.version || Memory.version < 3) {
        Memory.version = 3;
    }
    return operated;
}

export function checkMigrateDone() {
    if (_.isEmpty(Memory.rooms)) return false;
    return true;
}
