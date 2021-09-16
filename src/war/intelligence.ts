import cfg from "config";

Memory.playerWhiteList ||= {};
_.defaults(Memory.playerWhiteList, cfg.DEFAULT_PLAYER_WHITELIST);
export function isHostile(username: string) {
    return username != cfg.USER_NAME && !Memory.playerWhiteList[username];
}

export function getFleeTargets(pos: RoomPosition, range = 5) {
    if (global.myRooms[pos.roomName]) {
        if (global.myRooms[pos.roomName].defense.mode != "peace") {
            return _.filter(global.myRooms[pos.roomName].defense.currentHostiles, h => h.pos.inRangeTo(pos, range));
        } else {
            return [];
        }
    } else {
        return _.filter(Game.rooms[pos.roomName].war.getHostiles(), i => i.pos.inRangeTo(pos, range));
    }
}
