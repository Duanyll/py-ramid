import { TERMINAL_EXPORT_AMOUNT } from "config";
import { tryDealResource } from "market";
import { myRooms } from "roomInfo";
import { globalDelay, registerGlobalRoutine } from "scheduler";
import Logger from "utils/Logger";

export function runTerminals() {
    let sourceTerminals: { [type: string]: { terminal: StructureTerminal, amount: number }[] } = {};
    let terminalWorked: { [id: string]: boolean } = {};
    _.forIn(myRooms, room => {
        let terminal = room.structures.terminal;
        if (!terminal) return;
        for (const res in terminal.store) {
            let amount = Math.min(
                room.countStore(res as ResourceConstant) - (room.resource.reserve[res] || 0) - (room.resource.lock[res] || 0),
                terminal.store.getUsedCapacity(res as ResourceConstant)
            );
            if (amount > 0) {
                sourceTerminals[res] ||= [];
                sourceTerminals[res].push({ terminal, amount });
            }
        }
    })

    let continueToRun = false;
    _.forIn(myRooms, (room) => {
        if (!room.structures.terminal) return;
        for (const res in room.resource.import) {
            if (room.resource.import[res] <= 0) continue;
            continueToRun = true;
            if (!sourceTerminals[res]) continue;
            for (const source of sourceTerminals[res]) {
                const requireAmount = room.resource.import[res];
                if (terminalWorked[source.terminal.id]) continue;
                if (source.terminal.id == room.structures.terminal.id) continue;
                let transAmount = Math.min(TERMINAL_EXPORT_AMOUNT, requireAmount, source.amount);
                if (source.terminal.send(res as ResourceConstant, transAmount, room.name) == OK) {
                    Logger.silly(`Send ${transAmount} * ${res} from ${source.terminal.room.name} to ${room.name}`);
                    room.resource.import[res] -= transAmount;
                    myRooms[source.terminal.room.name].logStore(res as ResourceConstant, -transAmount);
                    room.logStore(res as ResourceConstant, transAmount);
                    terminalWorked[source.terminal.id] = true;
                    if (room.resource.import[res] <= 0) {
                        delete room.resource.import[res];
                        break;
                    }
                }
            }
        }
    });

    if (Memory.market.enableAutoDeal) {
        // @ts-ignore
        _.forIn(Memory.market.autoDeal, (info, type: ResourceConstant) => {
            if (sourceTerminals[type]) {
                sourceTerminals[type].forEach(t => {
                    if (terminalWorked[t.terminal.id]) return;
                    if (tryDealResource(t.terminal, type, t.amount)) {
                        terminalWorked[t.terminal.id] = true;
                    }
                })
            }
        })
    }
    globalDelay("runTerminal", TERMINAL_COOLDOWN);
}
registerGlobalRoutine("runTerminal", runTerminals);
