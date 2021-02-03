declare namespace NodeJS {
    /**
    * global 对象上挂载的方法用于在 console 中直接调用
    */
    interface Global {
        schedule: <TTask extends GlobalTask>(type: TTask, delay: number, param: GlobalTaskParam[TTask]) => void;
        lastException: number;
        autoSell: (type: ResourceConstant, price: number | false, reserve?: number) => void;
        produce: (type: ResourceConstant, amount: number, noBuffer?: boolean) => boolean;
        cancelLab: (roomName: string) => void;
        store: import("industry/store").GlobalStoreManager;
        unclaim: (roomName: string, keep: boolean) => void;
        yes: (key: number) => void;
        delay: (type: GlobalRoutine, time: number) => void;
        pbMining: (rooms: string[] | "clear") => void;
        burnPower: (roomName: string, amount: number | false | "auto") => void;
        disableTower: (room: string, time?: number) => void;
        loot: (flag: string, home: string, creepRun: number) => void;
        nuke: (delay: number, from: string, room: string, x: number, y: number) => void;
        logLevel: (level: LogLevel) => LogLevel;
        logLabs: () => void;
        recordWallDesign: (roomName: string, x1?: number, y1?: number, x2?: number, y2?: number) => void;
        logMoveRequest: (roomName: string) => void;
        resetResource: (roomName: string) => void;
        cancelAllLabs: () => void;
        mining: (roomName: string, enable: boolean) => void;
        myRooms: { [name: string]: import("room/roomInfo").RoomInfo; };
        reaction: (roomName: string, product: ResourceConstant, amount?: number) => void;
        rampart: (room: string, strength?: number) => void;
        sendClaimer: (roomName: string, target: string) => void;
        sendDismantler: (roomName: string, target: string) => void;
        sendAttacker: (roomName: string, target: string) => void;

        Game: Game;
        age: number;
        log: any;
        reloadRoomsNextTick?: boolean;
        migrating: boolean;
        _: _.LoDashStatic;
    }
}
