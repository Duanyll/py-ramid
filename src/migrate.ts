import { migrateToRoomDesign2 } from "room/designer";

export function initMigrate() {
    let operated = false;
    for (const roomName in Memory.rooms) {
        if (Memory.rooms[roomName].design.version < 3) {
            migrateToRoomDesign2(roomName);
            operated = true;
        }
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
