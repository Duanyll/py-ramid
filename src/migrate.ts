import { migrateToRoomDesign2 } from "room/designer";

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

export function initMigrate() {
    let operated = false;
    for (const roomName in Memory.rooms) {
        if (Memory.rooms[roomName].design.version < 3) {
            migrateToRoomDesign2(roomName);
            operated = true;
        }
    }
    if (!Memory.version || Memory.version < 1) {
        migrateLab();
        Memory.version = 1;
    }
    return operated;
}

export function checkMigrateDone() {
    for (const roomName in Memory.rooms) {
        if (Memory.rooms[roomName].design.version < 3)
            return false;
    }
    return true;
}
