import { myRooms } from "roomInfo";
import { registerTask, schedule } from "scheduler";
import Logger from "utils/Logger";

function launchNuke(param: { from: string, room: string, x: number, y: number }) {
    let nuker = myRooms[param.from]?.structures.nuker;
    if (nuker) {
        if (nuker.launchNuke(new RoomPosition(param.x, param.y, param.room)) == OK) {
            Logger.report(`Nuked ${param.room}`);
        }
    } else {
        Logger.error(`No nuker in ${param.from}!`);
    }
}
registerTask("launchNuke", launchNuke);

global.nuke = (delay: number, from: string, room: string, x: number, y: number) => {
    schedule("launchNuke", delay, { from, room, x, y });
}
