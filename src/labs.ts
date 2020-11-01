import { myRooms, registerCallback, RoomInfo } from "roomInfo";

class LabInfo {
    in: string[] = [];
    out: string[] = [];
    level: number;

    constructor(room: RoomInfo) {
        this.level = room.structRcl;
        room.structures.labs.forEach(a => {
            if (this.in.length >= 2)
                this.out.push(a.id);
            else {
                let canBeIn = true;
                room.structures.labs.forEach(b => {
                    if (!a.pos.inRangeTo(b, 2)) canBeIn = false;
                });
                (canBeIn ? this.in : this.out).push(a.id);
            }
        })

        // console.log(`Input labs for ${room.name}:`);
        // this.in.forEach(console.log);
    }
}

let labInfoCache: { [room: string]: LabInfo } = {}
function getLabInfo(room: RoomInfo): LabInfo {
    if (labInfoCache[room.name] && labInfoCache[room.name].level == room.structRcl)
        return labInfoCache[room.name];
    return labInfoCache[room.name] = new LabInfo(room);
}

function runLabs(room: RoomInfo) {
    if (room.structRcl < 6) return;
    switch (room.state.labMode) {
        case "disabled":
            room.structures.labs.forEach(l => {
                if (_.sum(_.values(l.store)) > 0) {
                    room.moveRequests.out[l.id] = {};
                    delete room.moveRequests.in[l.id];
                }
            });
            break;
        case "boost":
            for (let i = 0; i < room.structures.labs.length; i++) {
                let lab = room.structures.labs[i];
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
            let info = getLabInfo(room);
            let inputAmount = Infinity;
            for (let i = 0; i < 2; i++) {
                let resType = room.state.labContent[i];
                let lab = Game.getObjectById(info.in[i]) as StructureLab;
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
            let input0 = Game.getObjectById(info.in[0]) as StructureLab;
            let input1 = Game.getObjectById(info.in[1]) as StructureLab;
            for (let i = 0; i < info.out.length; i++) {
                let lab = Game.getObjectById(info.out[i]) as StructureLab;;
                if (lab.mineralType && lab.mineralType != product
                    || lab.store.getUsedCapacity(lab.mineralType) as number > 1000) {
                    room.moveRequests.out[lab.id] = {
                        type: lab.mineralType,
                        amount: lab.store[lab.mineralType]
                    }
                }
                if (inputAmount > 0) {
                    if (lab.runReaction(input0, input1) == OK) {
                        inputAmount -= LAB_REACTION_AMOUNT;
                        room.resource.lock[input0.mineralType] -= LAB_REACTION_AMOUNT;
                        room.resource.lock[input0.mineralType] -= LAB_REACTION_AMOUNT;
                        room.state.labRemainAmount -= LAB_REACTION_AMOUNT;
                        if (room.state.labRemainAmount <= 0) {
                            console.log(`${room.name} reaction done. `)
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
registerCallback("runLabs", runLabs);

function fetchLabWork(room: RoomInfo) {
    if (room.structRcl < 7 || room.state.labMode == "boost") {
        room.delay("fetchLabWork", 1000);
        return;
    }
    if (room.state.labMode == "reaction" && room.state.labRemainAmount > 0) {
        room.delay("fetchLabWork", 1000);
        return;
    }
    room.state.labContent?.forEach(r => room.resource.reserve[r] = 0);
    let task = Memory.labQueue.shift();
    if (task) {
        global.reaction(room.name, "reaction", task.recipe, task.amount);
    } else {
        global.reaction(room.name, "disabled");
    }
}
registerCallback("fetchLabWork", fetchLabWork);
