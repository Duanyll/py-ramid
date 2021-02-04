declare const _: import("lodash").LoDashStatic;

interface Room {
    /**
     * 该房间对应的 roomInfo 对象
     */
    readonly info: import("room/roomInfo").RoomInfo;
}

interface MoveToPosOpts {
    /**
     * 要前往的目标
     */
    pos: RoomPosition,
    /**
     * 接近目标的范围
     */
    range?: number,
    /**
     * 是否允许从其他房间走近路，目标在房间外忽略该选项
     *
     * 注意：如果允许，不要判断 Creep 当前是否在目标房间，否则会导致反复横跳
     */
    crossRoom?: boolean,
    /**
     * 是否允许离开墙内安全区，起点或目标在安全区外忽略该选项
     */
    ignoreSafeZone?: boolean
}

type CreepMovement = MoveToPosOpts | { room: string }

interface CreepExitInfo {
    target: string,
    exitPos?: RoomPosition,
    route: { room: string, exit: ExitConstant }[] | ERR_NO_PATH
}

interface CreepMoveInfo {
    dest: RoomPosition;
    time: number;
    path: PathStep[];
}

interface Creep {
    /**
     * 与 Creep 有相同 group 标记的 Creep 的集合
     */
    readonly group: Record<string, Creep>;

    /**
     * 获取、设置本 tick 内 creep 要前往的目标 (特定坐标或房间)
     */
    movement: CreepMovement,
    exitInfo: CreepExitInfo,
    moveInfo: CreepMoveInfo,
    posLock: boolean
}

interface PowerCreep {
    /**
     * 获取、设置本 tick 内 creep 要前往的目标 (特定坐标或房间)
     */
    movement: CreepMovement,
    exitInfo: CreepExitInfo,
    moveInfo: CreepMoveInfo,
    posLock: boolean
}

interface StructureTerminal {
    /**
     * 本 tick 内该 Terminal 是否发送给资源或进行过 deal 动作
     */
    worked: boolean;
}
