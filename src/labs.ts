import { managedRooms, registerCallback, RoomInfo } from "roomInfo";

function runLabs(room: RoomInfo) {
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
                    } else if (lab.store.getFreeCapacity(room.state.labContent[i]) > 1000) {
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
            for (let i = 0; i < 2; i++) {
                let lab = room.structures.labs[i];
                if (lab.store.getFreeCapacity(room.state.labContent[i]) > 1000) {
                    room.moveRequests.in[lab.id] = {
                        type: room.state.labContent[i],
                        amount: lab.store.getFreeCapacity(room.state.labContent[i])
                    };
                }
            }
            // @ts-ignore
            let product: ResourceConstant = REACTIONS[room.state.labContent[0]][room.state.labContent[1]];
            for (let i = 2; i < room.structures.labs.length; i++) {
                let lab = room.structures.labs[i];
                if (lab.mineralType && lab.mineralType != product
                    || lab.store.getUsedCapacity(lab.mineralType) as number > 1000) {
                    room.moveRequests.out[lab.id] = {
                        type: lab.mineralType,
                        amount: lab.store.getUsedCapacity(lab.mineralType)
                    }
                }
                lab.runReaction(room.structures.labs[0], room.structures.labs[1]);
            }
            // @ts-ignore
            let cooldown: number = REACTION_TIME[product];
            room.delay("runLabs", cooldown);
            break;
    }
}
registerCallback("runLabs", runLabs);

global.setLabs = (roomName: string, mode: "disabled" | "boost" | "reaction", content: ResourceConstant[]) => {
    let room = managedRooms[roomName];
    if (!room || room.structRcl < 6) {
        console.log(`Can't use labs in the room.`);
    }
    room.state.labMode = mode;
    room.state.labContent = content;
    room.delay("runLabs", 1);
}
