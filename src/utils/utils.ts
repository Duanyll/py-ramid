export function objToPos(obj: { x: number, y: number, room: string }) {
    return new RoomPosition(obj.x, obj.y, obj.room);
}

export function posToObj(pos: RoomPosition) {
    return { x: pos.x, y: pos.y, z: pos.roomName };
}

export function findRouteCallback(roomName: string) {
    if (Memory.roomsToAvoid[roomName]) return Infinity;
    let parsed = /^[WE]([0-9]+)[NS]([0-9]+)$/.exec(roomName);
    let isHighway = (Number(parsed[1]) % 10 === 0) ||
        (Number(parsed[2]) % 10 === 0);
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
    // @ts-ignore
    let goals = _.map(Game.rooms[from.roomName].find(type), (i) => {
        // @ts-ignore
        if (i.pos) i = i.pos as RoomPosition;
        return { range: 1, pos: i };
    }) as { range: number, pos: RoomPosition };
    let path = PathFinder.search(from, goals, {
        // @ts-ignore
        roomCallback: (name) => {
            if (name != from.roomName) return false;
    }});
    return path.cost;
}

export function estimateDistance(a: RoomPosition, b: RoomPosition) {
    if (a.roomName == b.roomName) {
        const path = PathFinder.search(a, b);
        return path.cost
    } else {
        let longPath = Game.map.findRoute(a.roomName, b.roomName, { routeCallback: findRouteCallback });
        if (longPath == ERR_NO_PATH) return Infinity;
        let dis = 0;
        dis += getDistanceByPath(a, longPath[0].exit);
        dis += 50 * (longPath.length - 1);
        dis += getDistanceByPath(b, OPPOSITE_EXIT[_.last(longPath).exit]);
        return dis;
    }
}
