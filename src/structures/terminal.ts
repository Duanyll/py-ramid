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
                room.storeCurrent.get(res as ResourceConstant) - room.storeBook.get(res as ResourceConstant),
                terminal.store[res as ResourceConstant]
            );
            if (amount > 0) {
                sourceTerminals[res] ||= [];
                sourceTerminals[res].push({ terminal, amount });
            }
        }
    })

    _.forIn(myRooms, (dest) => {
        const destTerminal = dest.structures.terminal;
        if (!destTerminal) return;
        dest.storeBook.forIn((amount, res) => {
            let importAmount = amount - dest.storeCurrent.get(res);
            if (importAmount <= 0) return;
            let source = _.find(sourceTerminals[res], i => !i.terminal.worked && i.terminal.id != destTerminal.id);
            if (source) {
                let transAmount = Math.min(cfg.TERMINAL_EXPORT_DEFAULT, importAmount, source.amount);
                if (source.terminal.send(res as ResourceConstant, transAmount, dest.name) == OK) {
                    Logger.silly(`Send ${transAmount} * ${res} from ${source.terminal.room.name} to ${dest.name}`);

                    myRooms[source.terminal.room.name].storeCurrent.add(res, -transAmount);
                    dest.storeCurrent.add(res, transAmount);
                }
            } else if (Memory.market.enableAutoDeal) {
                let buyInfo = Memory.market.autoBuy[res];
                if (-global.store.free(res) >= buyInfo?.minAmount) {
                    tryBuyResource(destTerminal, res, importAmount);
                }
            }
        })
    });

    if (Memory.market.enableAutoDeal) {
        _.forIn(Memory.market.autoDeal, (info, type: ResourceConstant) => {
            let readyTerminal = _.find(sourceTerminals[type], i => !i.terminal.worked);
            if (readyTerminal) tryDealResource(readyTerminal.terminal, type, readyTerminal.amount);
        });
    }
    globalDelay("runTerminal");
}
registerGlobalRoutine("runTerminal", runTerminals);
