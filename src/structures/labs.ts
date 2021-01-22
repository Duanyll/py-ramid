import { registerRoomRoutine, RoomInfo } from "room/roomInfo";
import Logger from "utils";

Memory.labQueue ||= [];

function runLabs(room: RoomInfo) {
    if (room.structRcl < 6) return;
    switch (room.state.labMode) {
        case "disabled":
            room.structures.labs.input.forEach(l => {
                if (_.sum(_.values(l.store)) > 0) {
                    room.moveRequests.out[l.id] = {};
                    delete room.moveRequests.in[l.id];
                }
            });
            room.structures.labs.output.forEach(l => {
                if (_.sum(_.values(l.store)) > 0) {
                    room.moveRequests.out[l.id] = {};
                    delete room.moveRequests.in[l.id];
                }
            });
            break;
        case "boost":
            for (let i = 0; i < room.structures.labs.output.length; i++) {
                let lab = room.structures.labs.output[i];
                if (room.state.labContent[i]) {
                    if (lab.store.getFreeCapacity(RESOURCE_ENERGY) > 1000) {
                        room.moveRequests.in[lab.id] = {
                            type: RESOURCE_ENERGY,
                            amount: lab.store.getFreeCapacity(RESOURCE_ENERGY)
                        };
                    } else if (lab.mineralType && lab.mineralType != room.state.labContent[i]) {
                        room.moveRequests.out[lab.id] = {
                            type: lab.mineralType,
                            amount: lab.store[lab.mineralType]
                        };
                    } else if
                        (lab.store.getFreeCapacity(room.state.labContent[i]) > 1000) {
                        room.moveRequests.in[lab.id] = {
                            type: room.state.labContent[i],
                            amount: lab.store.getFreeCapacity(room.state.labContent[i])
                        };
                    }
                }
            }
            room.delay("runLabs", 50);
            break;
        case "reaction":
            let inputAmount = Infinity;
            for (let i = 0; i < 2; i++) {
                let resType = room.state.labContent[i];
                let lab = room.structures.labs.input[i];
                if (lab.mineralType && lab.mineralType != resType) {
                    room.moveRequests.out[lab.id] = {
                        type: lab.mineralType,
                        amount: lab.store[lab.mineralType]
                    };
                    inputAmount = 0;
                } else if (lab.store.getFreeCapacity(resType) >= 1000) {
                    let requiredAmount = Math.min(lab.store.getFreeCapacity(resType),
                        room.state.labRemainAmount - lab.store.getUsedCapacity(resType));
                    if (requiredAmount > 0)
                        room.moveRequests.in[lab.id] = {
                            type: resType,
                            amount: requiredAmount
                        };
                    inputAmount = Math.min(inputAmount, lab.store.getUsedCapacity(resType));
                }
            }
            // @ts-ignore
            let product: ResourceConstant = REACTIONS[room.state.labContent[0]][room.state.labContent[1]];
            let input0 = room.structures.labs.input[0];
            let input1 = room.structures.labs.input[1];
            room.labRunning = (inputAmount >= LAB_REACTION_AMOUNT);
            for (let i = 0; i < room.structures.labs.output.length; i++) {
                let lab = room.structures.labs.output[i];
                if (lab.mineralType && lab.mineralType != product
                    || lab.store.getUsedCapacity(lab.mineralType) as number > 1000) {
                    room.moveRequests.out[lab.id] = {
                        type: lab.mineralType,
                        amount: lab.store[lab.mineralType]
                    }
                }
                if (inputAmount >= LAB_REACTION_AMOUNT) {
                    if (lab.runReaction(input0, input1) == OK) {
                        inputAmount -= LAB_REACTION_AMOUNT;
                        global.store.logReaction(room, product, room.state.labContent, LAB_REACTION_AMOUNT);
                        if (room.state.labRemainAmount <= 0) {
                            Logger.info(`${room.name} reaction done. `)
                            room.state.labMode = "disabled";
                            room.delay("fetchLabWork", 1);
                            return;
                        }
                    }
                }
            }
            // @ts-ignore
            let cooldown: number = REACTION_TIME[product];
            room.delay("runLabs", cooldown);
            break;
    }
}
registerRoomRoutine("runLabs", runLabs);

function fetchLabWork(room: RoomInfo) {
    if (room.structRcl < 7 || room.state.labMode == "boost") {
        room.delay("fetchLabWork");
        return;
    }
    if (room.state.labMode == "reaction" && room.state.labRemainAmount > 0) {
        room.delay("fetchLabWork");
        return;
    }
    let task = Memory.labQueue.shift();
    if (task) {
        let amount = (room.structRcl == 8) ? task.amount : Math.min(task.amount, 10000);
        task.amount -= amount;
        if (task.amount > 0) Memory.labQueue.unshift(task);
        global.reaction(room.name, "reaction", task.recipe, amount);
    } else {
        global.reaction(room.name, "disabled");
    }
}
registerRoomRoutine("fetchLabWork", fetchLabWork);
