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
            let inputReady = true;
            for (let i = 0; i < 2; i++) {
                let lab = Game.getObjectById(info.in[i]) as StructureLab;
                if (lab.mineralType && lab.mineralType != room.state.labContent[i]) {
                    room.moveRequests.out[lab.id] = {
                        type: lab.mineralType,
                        amount: lab.store[lab.mineralType]
                    };
                    inputReady = false;
                } else if (lab.store.getFreeCapacity(room.state.labContent[i]) > 1000) {
                    room.moveRequests.in[lab.id] = {
                        type: room.state.labContent[i],
                        amount: lab.store.getFreeCapacity(room.state.labContent[i])
                    };
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
                if (inputReady) {
                    if (lab.runReaction(input0, input1) == OK) {
                        room.state.labRemainAmount -= LAB_REACTION_AMOUNT;
                        if (room.state.labRemainAmount <= 0) {
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

global.labs = (roomName: string, mode: "disabled" | "boost" | "reaction", content?: ResourceConstant[], amount?: number) => {
    let room = myRooms[roomName];
    if (!room || room.structRcl < 6) {
        console.log(`Can't use labs in the room.`);
    }
    room.state.labMode = mode;
    if (mode != "disabled") {
        content.forEach(r => room.resource.reserve[r] = 3000);
    }
    room.state.labContent = content;
    if (mode == "reaction") {
        // @ts-ignore
        let product: ResourceConstant = REACTIONS[room.state.labContent[0]][room.state.labContent[1]];
        if (!room.resource.reserve[product]) room.resource.reserve[product] = 0;
        room.state.labRemainAmount = amount;
    }
    room.delay("runLabs", 1);
}

function fetchLabWork(room: RoomInfo) {
    if (room.structRcl < 7) { room.delay("fetchLabWork", 10000); return; }
    if (room.state.labRemainAmount > 0) { room.delay("fetchLabWork", 10000); return; }
    room.state.labContent.forEach(r => room.resource.reserve[r] = 0);
    let task = Memory.labQueue.shift();
    if (task) {
        global.labs(room.name, "reaction", task.recipe, task.amount);
    } else {
        global.labs(room.name, "disabled");
    }
}
registerCallback("fetchLabWork", fetchLabWork);

global.produceT3 = (a: "Z" | "K" | "U" | "L" | "G", b: "O" | "H", amount: number) => {
    let t1 = [a, b];
    let t2 = [a + b, "OH"] as ResourceConstant[];
    let t3 = ["X", a + (b == "O") ? "HO2" : "H2O"] as ResourceConstant[];
    Memory.labQueue.push(
        { recipe: t1, amount },
        { recipe: t2, amount },
        { recipe: t3, amount: _.floor(amount / 3) },
        { recipe: t3, amount: _.floor(amount / 3) },
        { recipe: t3, amount: _.floor(amount / 3) }
    );
    for (const room in myRooms) myRooms[room].delay("fetchLabWork", 1);
}

global.produceG = (amount: number) => {
    Memory.labQueue.push({ recipe: ["Z", "K"], amount }, { recipe: ["U", "L"], amount }, { recipe: ["ZK", "UL"], amount });
    for (const room in myRooms) myRooms[room].delay("fetchLabWork", 1);
}
