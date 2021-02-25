declare namespace _ {
    interface LoDashStatic {
        forIn<T>(object: T, it: (value: T[keyof T], key: any) => any): T;
    }
}

declare const _: typeof import("lodash");
interface Room {
    /**
     * 该房间对应的 roomInfo 对象
     */
    readonly info: import("room/roomInfo").RoomInfo;
}

interface StoreBase<POSSIBLE_RESOURCES extends ResourceConstant, UNLIMITED_STORE extends boolean> {
    /**
     * Shorthand for `getFreeCapacity`.
     * Always return a number
     */
    free(res?: ResourceConstant): number;
    /**
     * Shorthand for `getUsedCapacity`.
     * Always return a number
     */
    tot(res?: ResourceConstant): number;
    /**
     * Shorthand for `getCapacity`.
     * Always return a number
     */
    cap(res?: ResourceConstant): number;
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

interface Creep {
    /**
     * 与 Creep 有相同 group 标记的 Creep 的集合
     */
    readonly group: Record<string, Creep>;

    /**
     * 获取、设置本 tick 内 creep 要前往的目标 (特定坐标或房间)
     */
    movement: CreepMovement,
    /**
     * 获取、设置本 tick 内 creep 是否允许被对穿
     */
    posLock: boolean,
    /**
     * 将 creep 移动到目标，使用精确寻路
     * @param target 要去的目标
     * @param range 到达目标的范围
     * @returns 是否已经在目标范围内
     */
    goTo(target: RoomPosition | { pos: RoomPosition }, range?: number): boolean;
    /**
     * 将 creep 移动到房间，使用模糊寻路
     * @param room 要去的房间
     * @returns 是否在目标房间内
     */
    goToRoom(room: string): boolean;
}

interface PowerCreep {
    /**
     * 获取、设置本 tick 内 creep 要前往的目标 (特定坐标或房间)
     */
    movement: CreepMovement,
    /**
     * 获取、设置本 tick 内 creep 是否允许被对穿
     */
    posLock: boolean,

    /**
     * 将 creep 移动到目标，使用精确寻路
     * @param target 要去的目标
     * @param range 到达目标的范围
     * @returns 是否已经在目标范围内
     */
    goTo(target: RoomPosition | { pos: RoomPosition }, range?: number): boolean;
    /**
     * 将 creep 移动到房间，使用模糊寻路
     * @param room 要去的房间
     * @returns 是否在目标房间内
     */
    goToRoom(room: string): boolean;

    /**
     * 本 tick 内是否成功 `usePower`
     */
    powerUsed: boolean;
}

interface StructureTerminal {
    /**
     * 本 tick 内该 Terminal 是否发送给资源或进行过 deal 动作
     */
    worked: boolean;
}
