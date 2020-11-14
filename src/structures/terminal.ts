import { ROOM_RESERVE_T3 } from "config";
import { myRooms, RoomInfo } from "roomInfo";
import Logger from "utils/Logger";

export function runTerminals() {
    let sourceTerminals: { [type: string]: { terminal: StructureTerminal, amount: number }[] } = {};
    let terminalWorked: { [id: string]: boolean } = {};
    _.forIn(myRooms, room => {
        let terminal = room.structures.terminal;
        if (!terminal) return;
        for (const res in terminal.store) {
            let amount = Math.min(
                room.countResource(res as ResourceConstant) - (room.resource.reserve[res] ?? 0) - (room.resource.lock[res] ?? 0),
                terminal.store.getUsedCapacity(res as ResourceConstant)
            );
            if (amount > 0) {
                sourceTerminals[res] = sourceTerminals[res] || [];
                sourceTerminals[res].push({ terminal, amount });
            }
        }
    })

    _.forIn(myRooms, (room) => {
        if (!room.structures.terminal) return;
        for (const res in room.resource.import) {
            if (!sourceTerminals[res]) continue;
            for (const source of sourceTerminals[res]) {
                const amount = room.resource.import[res];
                if (terminalWorked[source.terminal.id]) continue;
                if (source.terminal.id == room.structures.terminal.id) continue;
                let transAmount = Math.min(5000, amount, source.amount);
                if (source.terminal.send(res as ResourceConstant, transAmount, room.name) == OK) {
                    Logger.silly(`Send ${transAmount} * ${res} from ${source.terminal.room.name} to ${room.name}`);
                    room.resource.import[res] -= transAmount;
                    terminalWorked[source.terminal.id] = true;
                    if (room.resource.import[res] <= 0) {
                        delete room.resource.import[res];
                        break;
                    }
                }
            }
        }
    })
}
