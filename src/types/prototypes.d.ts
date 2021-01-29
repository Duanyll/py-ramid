declare const _: import("lodash").LoDashStatic;

interface Room {
    /**
     * 该房间对应的 roomInfo 对象
     */
    readonly info: import("room/roomInfo").RoomInfo;
}

interface Creep {
    /**
     * 与 Creep 有相同 group 标记的 Creep 的集合
     */
    group: Record<string, Creep>;
}
