import { onVisibility } from "structures/observer"
import Logger, { registerCommand } from "utils/console"
import { getDesignSegment, saveRoomDesign } from "./memory"
import { designRoom } from "./design"
import { RMManager } from "utils"

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
    RMManager.read(getDesignSegment(roomName), (segment: Record<string, RoomDesignDetail>) => {
        printDesign(segment[roomName]);
    })
});
