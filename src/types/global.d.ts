declare namespace NodeJS {
    interface Global {
        help: (func?: any) => void;
        lastException: number;
        store: import("industry/store").SectionStore;
        yes: (key: number) => void;
        logLevel: (level: LogLevel) => LogLevel;
        myRooms: { [name: string]: import("room/roomInfo").RoomInfo; };
        rooms: { [name: string]: import("room/roomInfo").RoomInfo; };
        setTimeout: (type: GlobalRoutine, time: number) => void;

        Game: Game;
        age: number;
        log: any;
        reloadRoomsNextTick?: boolean;
        migrating: boolean;
        _: _.LoDashStatic;
    }
}
