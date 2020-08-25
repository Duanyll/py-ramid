import { RoomInfo, registerCallback } from "roomInfo";
import { STATS_SUMMARY_TIME, STATS_HISTORY_LIMIT } from "config";

function summaryRoomStats(room: RoomInfo) {
    console.log(`Stats for room ${room.name} from ${Game.time - STATS_SUMMARY_TIME} to ${Game.time}:`);
    console.log(room.stats.current);
    room.stats.history.push(room.stats.current);
    while (room.stats.history.length > STATS_HISTORY_LIMIT) room.stats.history.shift();

    room.delay("summatyStats", STATS_SUMMARY_TIME);
}
registerCallback("summatyStats", summaryRoomStats);
