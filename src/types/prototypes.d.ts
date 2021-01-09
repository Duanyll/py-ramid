declare const _: import("lodash").LoDashStatic;

interface Room {
    /**
     * 该房间对应的 roomInfo 对象
     */
    readonly info: import("room/roomInfo").RoomInfo;
}
