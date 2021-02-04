import { tryBuyResource, tryDealResource } from "industry/market";
import { myRooms } from "room/roomInfo";
import { globalDelay, registerGlobalRoutine } from "utils";
import Logger from "utils";
import cfg from "config";

let origSendMethod = StructureTerminal.prototype.send;
StructureTerminal.prototype.send = function (
    this: StructureTerminal, res: ResourceConstant, amount: number, dest: string, description?: string) {
    if (this.worked) return ERR_BUSY;
    let result = origSendMethod.call(this, res, amount, dest, description);
    if (result == OK) this.worked = true;
    return result;
}

export function runTerminals() {
    let sourceTerminals: { [type: string]: { terminal: StructureTerminal, amount: number }[] } = {};
    _.forIn(myRooms, room => {
        let terminal = room.structures.terminal;
        if (!terminal || terminal.cooldown) return;
        for (const res in terminal.store) {
            let amount = Math.min(
                room.countStore(res as ResourceConstant) - (room.resource.reserve[res] || 0) - (room.resource.lock[res] || 0),
                terminal.store[res as ResourceConstant]
            );
            if (amount > 0) {
                sourceTerminals[res] ||= [];
                sourceTerminals[res].push({ terminal, amount });
            }
        }
    })

    let continueToRun = false;
    _.forIn(myRooms, (dest) => {
        const destTerminal = dest.structures.terminal;
        if (!destTerminal) return;
        for (const res in dest.resource.import) {
            if (dest.resource.import[res] <= 0) continue;
            continueToRun = true;
            let source = _.find(sourceTerminals[res], i => !i.terminal.worked && i.terminal.id != destTerminal.id);
            if (source) {
                let transAmount = Math.min(cfg.TERMINAL_EXPORT_AMOUNT, dest.resource.import[res], source.amount);
                if (source.terminal.send(res as ResourceConstant, transAmount, dest.name) == OK) {
                    Logger.silly(`Send ${transAmount} * ${res} from ${source.terminal.room.name} to ${dest.name}`);

                    myRooms[source.terminal.room.name].logStore(res as ResourceConstant, -transAmount);
                    dest.logStore(res as ResourceConstant, transAmount);
                    dest.resource.import[res] -= transAmount;
                    if (dest.resource.import[res] <= 0) {
                        delete dest.resource.import[res];
                        continue;
                    }
                }
            } else {
                let buyInfo = Memory.market.autoBuy[res as ResourceConstant];
                if (-global.store.getFree(res as ResourceConstant) >= buyInfo?.minAmount) {
                    tryBuyResource(destTerminal, res as ResourceConstant, dest.resource.import[res]);
                }
            }
        }
    });

    if (Memory.market.enableAutoDeal) {
        // @ts-ignore
        _.forIn(Memory.market.autoDeal, (info, type: ResourceConstant) => {
            let readyTerminal = _.find(sourceTerminals[type], i => !i.terminal.worked);
            if (readyTerminal) tryDealResource(readyTerminal.terminal, type, readyTerminal.amount);
        });
    }
    globalDelay("runTerminal");
}
registerGlobalRoutine("runTerminal", runTerminals);
