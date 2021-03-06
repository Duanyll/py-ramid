import { myRooms } from "room/roomInfo";
import { registerTask, schedule } from "utils";
import Logger from "utils";
import { registerCommand } from "utils/console";

registerTask("launchNuke", (param) => {
    let nuker = myRooms[param.from]?.structures.nuker;
    if (nuker) {
        if (nuker.launchNuke(new RoomPosition(param.x, param.y, param.room)) == OK) {
            Logger.report(`Nuked ${param.room}`);
        }
    } else {
        Logger.error(`No nuker in ${param.from}!`);
    }
});

registerCommand('nuke', 'Nuke a room. ', [
    { name: "time", type: "number" },
    { name: "from", type: "myRoom" },
    { name: "room", type: "string" },
    { name: "xpos", type: "coord" },
    { name: "ypos", type: "coord" }
], (time: number, from: string, room: string, x: number, y: number) => {
    if (myRooms[room]) {
        Logger.error(`Can't nuke own room ${room}!`);
        return;
    }
    Logger.confirm(`Launch nuke from ${from} to [${room}, ${x}, ${y}] at ${time} (${time - Game.time} ticks later)`, `nuke ${room}`,
        () => { schedule("launchNuke", time - Game.time, { from, room, x, y }); });
})
