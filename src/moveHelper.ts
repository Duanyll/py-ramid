export function moveCreepTo(creep: Creep, pos: RoomPosition | { pos: RoomPosition }) {
    creep.moveTo(pos, {
        reusePath: 10,
    });
    // TODO: 实现优化寻路算法
}

interface ExitingCreepMemory extends CreepMemory {
    _exitInfo: { target: string, x: number, y: number, room: string }
}

export function moveCreepToRoom(creep: Creep, room: string) {
    let m = creep.memory as ExitingCreepMemory;
    if (!m._exitInfo || m._exitInfo.target != room || m._exitInfo.room != creep.room.name) {
        const dir = creep.room.findExitTo(room) as ExitConstant;
        let exit = creep.pos.findClosestByPath(dir);
        m._exitInfo = { target: room, room: creep.room.name, x: exit.x, y: exit.y };
    }
    moveCreepTo(creep, new RoomPosition(m._exitInfo.x, m._exitInfo.y, creep.room.name));
}
