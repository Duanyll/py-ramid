export function objToPos(obj: { x: number, y: number, room: string }) {
    return new RoomPosition(obj.x, obj.y, obj.room);
}

export function posToObj(pos: RoomPosition) {
    return { x: pos.x, y: pos.y, z: pos.roomName };
}
