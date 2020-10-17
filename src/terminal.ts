import { myRooms } from "roomInfo";

export function runTerminals() {
    let sourceTerminals: { [type: string]: StructureTerminal[] } = {};
    let terminalWorked: { [id: string]: boolean } = {};
    _.forIn(myRooms, room => {
        let terminal = room.structures.terminal;
        if (!terminal) return;
        for (const res in terminal.store) {
            sourceTerminals[res] = sourceTerminals[res] || [];
            sourceTerminals[res].push(terminal);
        }
    })

    _.forIn(myRooms, (room) => {
        if (!room.structures.terminal) return;
        for (const res in room.resource.reserve) {
            let current = room.structures.terminal.store.getUsedCapacity(res as ResourceConstant)
                + room.structures.storage.store.getUsedCapacity(res as ResourceConstant);
            if (current < room.resource.reserve[res]) {
                let sender = _.find(sourceTerminals[res], t => !terminalWorked[t.id] && t.id != room.structures.terminal.id);
                if (sender) {
                    let amount = Math.min(room.resource.reserve[res] - current,
                        sender.store.getUsedCapacity(res as ResourceConstant));
                    if (sender.send(res as ResourceConstant, amount, room.name) == OK) {
                        terminalWorked[sender.id] = true;
                        terminalWorked[room.structures.terminal.id] = true;
                        return;
                    }
                }
            }
        }
    })
}
