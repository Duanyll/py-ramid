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

    /**
     * 房间内所有 creep 欢呼
     * @param text 要 say 的文本
     */
    yell(text?: string): void;

    /** 手动刷新房间 CostMatrix 缓存, 比如摧毁了房间内建筑等情况 */
    updateMatrix(): void;

    war: import("war/warZoneInfo").WarZoneInfo;
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

interface GoToPosOpts {
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
    crossRoom?: boolean
}

interface GoToRoomOpts {
    /**
     * 要前往的目标房间
     */
    room: string;
}

interface FollowOpts {
    /**
     * 跟随的 Creep 的名称
     */
    following: string;
}

interface FleeOpts {
    /**
     * 要试图逃离的坐标
     */
    fleeFrom: RoomPosition[];
}

interface MovementOpts {
    /**
     * 是否需要等待跟随自己的 creep
     */
    waitForFollowers?: boolean;
    /**
     * 跟随自己的 creep
     */
    followedBy?: string;
}

type CreepMovement = (GoToPosOpts | GoToRoomOpts | FollowOpts | FleeOpts) & MovementOpts;

interface Creep {
    /**
     * 与 Creep 有相同 group 标记的 Creep 的集合
     */
    readonly group: Record<string, Creep>;

    /**
     * 缓存了一些有关 Creep 的数据
     */
    readonly info: import("creep/creepInfo").CreepInfo;

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
     * 要求这只 Creep 跟随另一只 Creep
     * @param target 要跟随的 Creep
     */
    follow(target: AnyCreep): boolean;

    flee(target: RoomPosition[]): void;

    shouldWaitForFollower: boolean;
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

    /**
     * 要求这只 Creep 跟随另一只 Creep
     * @param target 要跟随的 Creep
     */
    follow(target: AnyCreep): boolean;

    shouldWaitForFollower: boolean
}

interface RoomObject {
    /**
     * 获取当前该对象上的 power 等级, 没有该 power 返回 0
     * @param power 要获取的 power 的 ID
     */
    getPower(power: PowerConstant): number;
}

interface StructureTerminal {
    /**
     * 本 tick 内该 Terminal 是否发送给资源或进行过 deal 动作
     */
    worked: boolean;
}

interface RoomPosition {
    /**
     * 坐标是否在房间边缘上
     */
    isOnEdge(): boolean;
    /**
     * 坐标是否与房间边缘相邻
     */
    isNearEdge(): boolean;
    /**
     * 如果这个点在边缘上, 返回另一侧房间出口的坐标
     */
    getOppositeExit(): RoomPosition;
}
