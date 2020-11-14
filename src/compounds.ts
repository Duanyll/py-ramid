import { ROOM_RESERVE_T3 } from "config";
import { myRooms } from "roomInfo";
import Logger from "utils/Logger";

global.resetResource = () => {
    _.forIn(myRooms, (room) => {
        room.resource.produce = {
            [room.structures.mineral.mineralType]: true
        };
        room.resource.reserve = {
            XUH2O: ROOM_RESERVE_T3,
            XKH2O: ROOM_RESERVE_T3,
            XKHO2: ROOM_RESERVE_T3,
            XLH2O: ROOM_RESERVE_T3,
            XLHO2: ROOM_RESERVE_T3,
            XZH2O: ROOM_RESERVE_T3,
            XZHO2: ROOM_RESERVE_T3,
            XGHO2: ROOM_RESERVE_T3,
            G: ROOM_RESERVE_T3
        };
        room.resource.import = {};
        room.resource.export = {
            [room.structures.mineral.mineralType]: 10000
        };
        room.resource.lock = {};
    })
}

global.bookForReserve = (dryRun?: boolean) => {
    let current: { [type: string]: number } = {};
    _.forIn(myRooms, room => {
        _.forIn(room.resource.reserve, (amount, type) => {
            current[type] = current[type] || 0;
            let roomRequest = room.countResource(type as ResourceConstant) - amount - (room.resource.lock[type] || 0);
            if (roomRequest < 0 && !dryRun) {
                room.resource.import[type] = (room.resource.import[type] - roomRequest) || -roomRequest;
            }
            current[type] -= roomRequest;
        })
    });
    _.forIn(current, (amount, type) => {
        if (amount <= 0) return;
        Logger.report(`Request for ${type}: ${amount}`);
        if (!dryRun)
            if (type == RESOURCE_GHODIUM) {
                global.produceG(amount);
            } else {
                global.produceT3(type[1] as any, (type[3] == "2") ? "H" : "O", amount);
            }
    })
    for (const room in myRooms) myRooms[room].delay("fetchLabWork", 1);
}

global.reaction = (roomName: string, mode: "disabled" | "boost" | "reaction", content?: ResourceConstant[], amount?: number) => {
    let room = myRooms[roomName];
    if (!room || room.structRcl < 6) {
        Logger.error(`Can't use labs in the room.`);
    }
    room.state.labMode = mode;
    room.state.labContent = content;
    if (mode == "reaction") {
        // @ts-ignore
        let product: ResourceConstant = REACTIONS[content[0]][content[1]];
        Logger.info(`Room ${roomName} takes reaction task ${content[0]} + ${content[1]} = ${product} * ${amount}`)
        room.requestResource(content[0], amount);
        room.requestResource(content[1], amount);
        room.state.labRemainAmount = amount;
        room.resource.export[product] = 10000;
    }
    room.delay("runLabs", 1);
}

global.produceT3 = (a: "Z" | "K" | "U" | "L" | "G", b: "O" | "H", amount: number) => {
    amount = _.ceil(amount / 5) * 5;
    let t1 = [a, b];
    let t2 = [a + b, "OH"] as ResourceConstant[];
    let t3 = ["X", a + ((b == "O") ? "HO2" : "H2O")] as ResourceConstant[];
    if (a == "G") global.produceG(amount);
    Memory.labQueue.push(
        { recipe: t1, amount },
        { recipe: ['O', 'H'], amount },
        { recipe: t2, amount },
        { recipe: t3, amount }
    );
    for (const room in myRooms) myRooms[room].delay("fetchLabWork", 1);
}

global.produceG = (amount: number) => {
    Memory.labQueue.push({ recipe: ["Z", "K"], amount }, { recipe: ["U", "L"], amount }, { recipe: ["ZK", "UL"], amount });
    for (const room in myRooms) myRooms[room].delay("fetchLabWork", 1);
}

global.cancelAllLabs = () => {
    for (const name in myRooms) {
        let room = myRooms[name];
        room.state.labMode = "disabled";
        delete room.state.labRemainAmount;
        room.delay("runLabs", 1);
    }
    Memory.labQueue = [];
}

global.logLabs = () => {
    for (const name in myRooms) {
        let room = myRooms[name];
        const content = room.state.labContent;
        switch (room.state.labMode) {
            case "disabled":
                Logger.report(`${name}: Empty`);
                break;
            case "reaction":
                // @ts-ignore
                let product: ResourceConstant = REACTIONS[content[0]][content[1]];
                Logger.report(`${name}: ${content[0]} + ${content[1]} = ${product} * ${room.state.labRemainAmount}`);
                break;
            case "boost":
                Logger.report(`${name}: ${content.toString()}`);
                break;
        }
    }
}
