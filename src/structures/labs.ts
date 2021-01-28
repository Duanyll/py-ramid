import { LAB_RECIPE } from "utils/constants";
import { registerRoomRoutine, RoomInfo } from "room/roomInfo";
import Logger from "utils";

Memory.labQueue ||= [];

function runLabs(room: RoomInfo) {
    if (room.structRcl < 6) return;
    const info = room.state.lab;
    const labs = room.structures.labs;
    const outputLabs = _.drop(labs.output, info.boost.length);
    if (info.remain) {
        let inputAmount = Infinity;
        for (let i = 0; i < 2; i++) {
            let resType = LAB_RECIPE[info.product][i];
            let lab = labs.input[i];
            if (lab.mineralType && lab.mineralType != resType) {
                room.moveRequests.out[lab.id] = {
                    type: lab.mineralType,
                    amount: lab.store[lab.mineralType]
                };
                inputAmount = 0;
            } else if (lab.store.getFreeCapacity(resType) >= 1000) {
                let requiredAmount = Math.min(lab.store.getFreeCapacity(resType),
                    info.remain - lab.store.getUsedCapacity(resType));
                if (requiredAmount > 0)
                    room.moveRequests.in[lab.id] = {
                        type: resType,
                        amount: requiredAmount
                    };
                inputAmount = Math.min(inputAmount, lab.store.getUsedCapacity(resType));
            }
        }
        let input0 = labs.input[0];
        let input1 = labs.input[1];
        room.labRunning = (inputAmount >= LAB_REACTION_AMOUNT);
        for (let i = 0; i < outputLabs.length; i++) {
            let lab = outputLabs[i];
            if (lab.mineralType && lab.mineralType != info.product
                || lab.store.getUsedCapacity(lab.mineralType) as number > 1000) {
                room.moveRequests.out[lab.id] = {
                    type: lab.mineralType,
                    amount: lab.store[lab.mineralType]
                }
            }
            if (inputAmount >= LAB_REACTION_AMOUNT) {
                if (lab.runReaction(input0, input1) == OK) {
                    inputAmount -= LAB_REACTION_AMOUNT;
                    global.store.logReaction(room, info.product, LAB_REACTION_AMOUNT);
                    if (info.remain <= 0) {
                        Logger.info(`${room.name} reaction done. `)
                        info.remain = 0;
                        room.delay("fetchLabWork", 1);
                        return;
                    }
                }
            }
        }
        // @ts-ignore
        let cooldown: number = REACTION_TIME[info.product];
        room.delay("runLabs", cooldown);
    } else {
        labs.input.forEach(l => {
            if (l.mineralType) {
                room.moveRequests.out[l.id] = { type: l.mineralType, amount: l.store[l.mineralType] };
                delete room.moveRequests.in[l.id];
            }
        });
        outputLabs.forEach(l => {
            if (l.mineralType) {
                room.moveRequests.out[l.id] = { type: l.mineralType, amount: l.store[l.mineralType] };
                delete room.moveRequests.in[l.id];
            }
        });
    }

    room.delay("runLabs");
}
registerRoomRoutine("runLabs", runLabs);

function fetchLabWork(room: RoomInfo) {
    if (room.structRcl < 7 || room.state.lab.boost.length >= 7) {
        room.delay("fetchLabWork");
        return;
    }
    if (room.state.lab.remain) {
        room.delay("fetchLabWork");
        return;
    }
    let task = Memory.labQueue.shift();
    if (task) {
        let amount = (room.structRcl == 8) ? task.amount : Math.min(task.amount, 10000);
        task.amount -= amount;
        if (task.amount > 0) Memory.labQueue.unshift(task);
        global.reaction(room.name, task.product, amount);
    }
}
registerRoomRoutine("fetchLabWork", fetchLabWork);

function runLabBoost(room: RoomInfo) {
    if (room.structRcl < 6) return;
    const info = room.state.lab;
    const labs = room.structures.labs;
    if (info.boostExpires && info.boostExpires < Game.time) {
        info.boost = [];
        delete info.boostExpires;
    }
    const labsForBoost = _.take(labs.output, info.boost.length);
    for (let i = 0; i < labsForBoost.length; i++) {
        let lab = labsForBoost[i];
        if (lab.store.getFreeCapacity(RESOURCE_ENERGY) > 1000) {
            room.moveRequests.in[lab.id] = {
                type: RESOURCE_ENERGY,
                amount: lab.store.getFreeCapacity(RESOURCE_ENERGY)
            };
        } else if (lab.mineralType && lab.mineralType != info.boost[i]) {
            room.moveRequests.out[lab.id] = {
                type: lab.mineralType,
                amount: lab.store[lab.mineralType]
            };
        } else if
            (lab.store.getFreeCapacity(info.boost[i]) > 1000) {
            room.moveRequests.in[lab.id] = {
                type: info.boost[i],
                amount: lab.store.getFreeCapacity(info.boost[i])
            };
        }
    }
    if (labsForBoost.length > 0) room.delay("runBoost");
}
registerRoomRoutine("runBoost", runLabBoost);
