import { onVisibility } from "structures/observer"
import Logger, { registerCommand } from "utils/console"
import { saveRoomDesign } from "./memory"
import { designRoom } from "./design"
import Storage from "utils/rawMemory"

export { migrateToRoomDesign2 } from "./memory"

function printDesign(detail: RoomDesignDetail) {
    for (let i = 0; i < 50; i++) {
        Logger.report(detail.matrix[i]);
    }
}

registerCommand('designRoom', 'Create and save RoomDesign data for any room', [
    { name: "room", type: "room" },
    { name: "save", type: "boolean" }
], (roomName: string, save: boolean) => {
    onVisibility(roomName, () => {
        let room = Game.rooms[roomName];
        let design = designRoom(room);
        printDesign(design[1]);
        if (save) saveRoomDesign(roomName, design);
    })
});

registerCommand('previewDesign', 'Preview saved RoomDesign data for a room', [
    { name: "room", type: "room" }
], (roomName: string) => {
    if (!Memory.rooms[roomName]?.design) {
        Logger.error(`No design data for room ${roomName}. Create with designRoom(${roomName})`);
        return;
    }
    Storage.getKey("roomDesign", roomName, (segment: RoomDesignDetail) => {
        printDesign(segment);
        return false;
    })
});
