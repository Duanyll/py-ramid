import { myRooms } from "room/roomInfo";
import Logger from "utils";

export const COMPOUND_RECIPE: Partial<Record<ResourceConstant, ResourceConstant[]>> = {};
_.forIn(REACTIONS, (res2s, res1) => {
    _.forIn(res2s, (product, res2) => {
        // @ts-ignore
        COMPOUND_RECIPE[product] = [res1, res2];
    })
})
export function produceCompound(product: ResourceConstant, amount: number, fromBuffer?: boolean) {
    amount = _.ceil(amount / LAB_REACTION_AMOUNT) * LAB_REACTION_AMOUNT;
    let recipe = COMPOUND_RECIPE[product];
    if (!recipe) return;
    recipe.forEach(r => {
        if (!COMPOUND_RECIPE[r]) return;
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
        recipe, amount
    });
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

global.cancelAllLabs = () => {
    for (const name in myRooms) {
        global.cancelLab(name);
    }
}

global.cancelLab = (roomName: string) => {
    let room = myRooms[roomName];
    if (room.state.labMode == "reaction") {
        room.state.labContent.forEach(r => room.resource.lock[r] -= room.state.labRemainAmount);
        Memory.labQueue.unshift({ recipe: room.state.labContent, amount: room.state.labRemainAmount });
    }
    room.state.labMode = "disabled";
    delete room.state.labRemainAmount;
    room.delay("runLabs", 1);
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
