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

export function getRoomType(name: string): "crossroad" | "highway" | "normal" | "sk" {
    let xx = parseInt(name.substr(1), 10);
    let verticalPos = 2;
    if (xx >= 100) {
        verticalPos = 4;
    } else if (xx >= 10) {
        verticalPos = 3;
    }
    let yy = parseInt(name.substr(verticalPos + 1), 10);
    xx %= 10;
    yy %= 10;
    if (xx == 0 && yy == 0) {
        return "crossroad";
    } else if (xx == 0 || yy == 0) {
        return "highway";
    } else if ((xx >= 4 && xx <= 6) && (yy >= 4 && yy <= 6)) {
        return "sk";
    } else {
        return "normal";
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

Object.defineProperty(Room.prototype, 'yell', {
    value: function (this: Room, text = '🔺') {
        this.find(FIND_MY_CREEPS).forEach(creep => creep.say(text, true));
    }
})

export * from "./dataStructure";
export * from "./errorMapper";
export * from "./scheduler";
export * from "./rawMemory";
export default Logger;
