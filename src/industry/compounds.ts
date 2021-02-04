import { myRooms } from "room/roomInfo";
import Logger from "utils";
import { LAB_RECIPE } from "../utils/constants";

export function produceCompound(product: ResourceConstant, amount: number, fromBuffer?: boolean) {
    amount = _.ceil(amount / LAB_REACTION_AMOUNT) * LAB_REACTION_AMOUNT + 10; // 多生产 10 个，保证使用 Power 时也能反应完
    let recipe = LAB_RECIPE[product];
    if (!recipe) return;
    recipe.forEach(r => {
        if (!LAB_RECIPE[r]) return;
        let free = global.store.getFree(r) - amount;
        if (free < 0) produceCompound(r, -free);
        global.store.materialLock[r] ||= 0;
        global.store.materialLock[r] += amount;
    });
    if (!fromBuffer) {
        global.store.productLock[product] ||= 0;
        global.store.productLock[product] += amount;
    }
    Memory.labQueue.push({
        product, amount
    });
    for (const room in myRooms) myRooms[room].delay("fetchLabWork", 1);
}

global.reaction = (roomName: string, product: ResourceConstant, amount?: number) => {
    let room = myRooms[roomName];
    if (!room || room.structRcl < 6) {
        Logger.error(`Can't use labs in the room.`);
    }

    Logger.info(`Room ${roomName} takes reaction task ${product} * ${amount}`);

    const content = LAB_RECIPE[product];
    room.requestResource(content[0], amount);
    room.requestResource(content[1], amount);
    room.state.lab.product = product;
    room.state.lab.remain = amount;
    room.resource.export[product] = 10000;

    room.delay("runLabs", 1);
}

global.cancelAllLabs = () => {
    for (const name in myRooms) {
        global.cancelLab(name);
    }
}

global.cancelLab = (roomName: string) => {
    let room = myRooms[roomName];
    if (room.state.lab.remain) {
        LAB_RECIPE[room.state.lab.product].forEach(r => room.resource.lock[r] -= room.state.lab.remain);
        Memory.labQueue.unshift({ product: room.state.lab.product, amount: room.state.lab.remain });
    }
    room.state.lab.remain = 0;
    room.delay("runLabs", 1);
}

global.logLabs = () => {
    for (const name in myRooms) {
        let room = myRooms[name];
        let res = name + ": ";
        if (room.state.lab.remain) {
            res += `${room.state.lab.remain} * ${room.state.lab.product} `
        }
        if (room.state.lab.boost.length) {
            res += `boost: [${room.state.lab.boost.join(',')}]`;
        }
        Logger.report(res);
    }
}
