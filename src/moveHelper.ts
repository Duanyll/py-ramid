export function moveCreepTo(creep: Creep, pos: RoomPosition | { pos: RoomPosition }) {
    creep.moveTo(pos, {
        reusePath: 10
    });
    // TODO: 实现优化寻路算法
}
