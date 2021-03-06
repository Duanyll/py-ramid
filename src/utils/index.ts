import cfg from "config";
import Logger from "./console";
import "./rawMemory"
import RMManager from "./rawMemory";

export function objToPos(obj: { x: number, y: number, room: string }) {
    return new RoomPosition(obj.x, obj.y, obj.room);
}

export function posToObj(pos: RoomPosition) {
    return { x: pos.x, y: pos.y, room: pos.roomName };
}

export function roomNameToXY(name: string): [number, number] {
    let xx = parseInt(name.substr(1), 10);
    let verticalPos = 2;
    if (xx >= 100) {
        verticalPos = 4;
    } else if (xx >= 10) {
        verticalPos = 3;
    }
    let yy = parseInt(name.substr(verticalPos + 1), 10);
    let horizontalDir = name.charAt(0);
    let verticalDir = name.charAt(verticalPos);
    if (horizontalDir === 'W' || horizontalDir === 'w') {
        xx = -xx - 1;
    }
    if (verticalDir === 'N' || verticalDir === 'n') {
        yy = -yy - 1;
    }
    return [xx, yy];
};

export function findRouteCallback(roomName: string) {
    if (Memory.roomsToAvoid[roomName]) return Infinity;
    if (Memory.roomCost[roomName]) return Memory.roomCost[roomName];
    let parsed = roomNameToXY(roomName);
    let isHighway = (Number(parsed[0]) % 10 === 0) ||
        (Number(parsed[1]) % 10 === 0);
    let isMyRoom = Game.rooms[roomName] &&
        Game.rooms[roomName].controller &&
        Game.rooms[roomName].controller.my;
    if (isHighway || isMyRoom) {
        return 1;
    } else {
        return 1.5;
    }
}

export const OPPOSITE_EXIT = {
    [FIND_EXIT_TOP]: FIND_EXIT_BOTTOM,
    [FIND_EXIT_BOTTOM]: FIND_EXIT_TOP,
    [FIND_EXIT_LEFT]: FIND_EXIT_RIGHT,
    [FIND_EXIT_RIGHT]: FIND_EXIT_LEFT
};

function getDistanceByPath(from: RoomPosition, type: FindConstant) {
    switch (type) {
        case FIND_EXIT_BOTTOM:
            return 50 - from.y;
        case FIND_EXIT_TOP:
            return from.y;
        case FIND_EXIT_LEFT:
            return from.x;
        case FIND_EXIT_RIGHT:
            return 50 - from.x;
        default:
            if (!Game.rooms[from.roomName]) return 25;
            let goals = _.map(Game.rooms[from.roomName].find(type), (i) => {
                if ('pos' in i) i = i.pos as RoomPosition;
                return { range: 1, pos: i };
            });
            let path = PathFinder.search(from, goals, {
                roomCallback: (name) => {
                    if (name != from.roomName) return false;
                }
            });
            return path.cost;
    }
}

export function estimateDistance(a: RoomPosition, b: RoomPosition) {
    if (a.roomName == b.roomName) {
        const path = PathFinder.search(a, b);
        return path.cost;
    } else {
        let longPath = Game.map.findRoute(a.roomName, b.roomName, { routeCallback: findRouteCallback });
        if (longPath == ERR_NO_PATH) return Infinity;
        let dis = 0;
        dis += getDistanceByPath(a, longPath[0].exit);
        dis += 50 * (longPath.length - 1);
        dis += getDistanceByPath(b, OPPOSITE_EXIT[_.last(longPath).exit]);
        Logger.debug(`Estimating distance from ${a} to ${b}: ${dis}`)
        return dis;
    }
}

export function getCreepSpawnTime(body: BodyPartDescription) {
    return _.sumBy(body, (p) => p[1]) * 3;
}

export function getCreepCost(body: BodyPartDescription) {
    return _.sumBy(body, (p) => BODYPART_COST[p[0]] * p[1]);
}

export function expandBodypart(body: BodyPartDescription) {
    let res: BodyPartConstant[] = [];
    body.forEach((p) => {
        for (let i = 0; i < p[1]; i++) res.push(p[0]);
    });
    return res;
}

Memory.playerWhiteList ||= {};
_.defaults(Memory.playerWhiteList, cfg.DEFAULT_PLAYER_WHITELIST);
export function isHostile(username: string) {
    return !Memory.playerWhiteList[username];
}

export * from "./dataStructure";
export * from "./errorMapper";
export * from "./scheduler";
export * from "./rawMemory";
export default Logger;
