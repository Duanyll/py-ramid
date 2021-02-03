import { registerCreepRole } from "creep/roles";
import { moveCreepTo, moveCreepToRoom } from "creep/movement";
import { myRooms } from "room/roomInfo";
import { registerTask, schedule } from "utils";
import { onVisibility } from "structures/observer";
import Logger from "utils";

interface RemoteCarrierMemory extends CreepMemory {
    status: "go" | "back",
    home: string,
    remainRun: number;
}

let LOOT_ITEMS: { [type in ResourceConstant]?: boolean } = {
    [RESOURCE_POWER]: true,
    "XGH2O": true,
    "XGHO2": true,
    "XKH2O": true,
    "XKHO2": true,
    "XLH2O": true,
    "XLHO2": true,
    "XUH2O": true,
    "XUHO2": true,
    "XZH2O": true,
    "XZHO2": true
}

export function runLootCarrier(creep: Creep) {
    const m = creep.memory as RemoteCarrierMemory;
    const flag = Game.flags[m.target];
    if (!flag) {
        Logger.error(`${creep.name}: Invalid target ${m.target}`)
        creep.suicide();
        return;
    }
    if (m.status == "go") {
        if (creep.pos.isNearTo(flag.pos)) {
            if (creep.store.getFreeCapacity() == 0) {
                m.status = "back";
            } else {
                let target = flag.pos.lookFor(LOOK_STRUCTURES).find(s => "store" in s) as AnyStoreStructure;
                if (!target) {
                    Logger.error(`${creep.name}: Invalid target ${m.target}`)
                    creep.suicide();
                    return;
                }
                for (const type in target.store) {
                    if (LOOT_ITEMS[type as ResourceConstant]) {
                        creep.withdraw(target, type as ResourceConstant);
                        return;
                    }
                }
                m.status = "back";
            }
        } else {
            if (creep.room.name != flag.pos.roomName) {
                moveCreepToRoom(creep, flag.pos.roomName);
            } else {
                moveCreepTo(creep, flag);
            }
        }
    } else {
        const room = myRooms[m.home];
        const terminal = room.structures.terminal;
        if (creep.pos.isNearTo(terminal)) {
            for (const type in creep.store) {
                creep.transfer(terminal, type as ResourceConstant);
                room.logStore(type as ResourceConstant, creep.store[type as ResourceConstant]);
                return;
            }
            if (m.remainRun > 0) {
                m.remainRun--;
                m.status = "go";
            } else {
                creep.suicide();
            }
        } else {
            if (creep.room.name != m.home) {
                moveCreepToRoom(creep, m.home);
            } else {
                moveCreepTo(creep, terminal);
            }
        }
    }
}

registerCreepRole({ "rCarry": runLootCarrier });

registerTask("checkLoot", (param) => {
    const flag = Game.flags[param.flag];
    if (!flag) {
        Logger.report(`Loot ${flag.name} compelete.`);
    } else {
        onVisibility(flag.pos.roomName, () => {
            Logger.debug(`checking loot flag ${flag.name}`)
            let target = flag.pos.lookFor(LOOK_STRUCTURES).find(s => "store" in s) as AnyStoreStructure;
            let continueLoot = false;
            if (target) {
                for (const type in target.store) {
                    if (LOOT_ITEMS[type as ResourceConstant]) {
                        continueLoot = true;
                        break;
                    }
                }
            }
            if (continueLoot) {
                Logger.debug(`Continue looting ${flag.name}`)
                myRooms[param.home].requestSpawn("rCarry", {
                    name: `loot-${flag.name}-${Game.time}`,
                    memory: {
                        role: "rCarry",
                        target: flag.name,
                        status: "go",
                        home: param.home,
                        remainRun: param.creepRun - 1
                    } as CreepMemory
                });
                schedule("checkLoot", 500, param);
            } else {
                Logger.report(`Loot ${flag.name} compelete.`)
            }
        })
    }
});

global.loot = (flag: string, home: string, creepRun: number) => {
    schedule("checkLoot", 1, { flag, home, creepRun });
}
