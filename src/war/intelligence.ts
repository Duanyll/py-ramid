import cfg from "config";

Memory.playerWhiteList ||= {};
_.defaults(Memory.playerWhiteList, cfg.DEFAULT_PLAYER_WHITELIST);
export function isHostile(username: string) {
    return username != cfg.USER_NAME && !Memory.playerWhiteList[username];
}
