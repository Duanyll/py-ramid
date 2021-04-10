import { myRooms } from "room/roomInfo";
import { registerTask, schedule } from "utils";
import { onVisibility } from "structures/observer";
import Logger from "utils";
import { registerCommand } from "utils/console";
import { estimateDistance } from "creep/movement/pathfinding";
import { creepRole, CreepRoleBase, memorize } from "creep/role";

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

@creepRole("rCarry")
export class RoleLootCarrier extends CreepRoleBase {
    @memorize
    target: string;
    @memorize
    status: "go" | "back";
    @memorize
    home: string;
    @memorize
    remainRun: number;
    run(creep: Creep) {
        const flag = Game.flags[this.target];
        if (!flag) {
            Logger.error(`${creep.name}: Invalid target ${this.target}`)
            creep.suicide();
            return;
        }
        if (this.status == "go") {
            if (creep.goToRoom(flag.pos.roomName) && creep.goTo(flag)) {
                if (creep.store.getFreeCapacity() == 0) {
                    this.status = "back";
                } else {
                    let target = flag.pos.lookFor(LOOK_STRUCTURES).find(s => "store" in s) as AnyStoreStructure;
                    if (!target) {
                        Logger.error(`${creep.name}: Invalid target ${this.target}`)
                        creep.suicide();
                        return;
                    }
                    for (const type in target.store) {
                        if (LOOT_ITEMS[type as ResourceConstant]) {
                            creep.withdraw(target, type as ResourceConstant);
                            return;
                        }
                    }
                    this.status = "back";
                }
            }
        } else {
            const room = myRooms[this.home];
            const terminal = room.structures.terminal;
            if (creep.goToRoom(this.home) && creep.goTo(terminal)) {
                for (const type in creep.store) {
                    creep.transfer(terminal, type as ResourceConstant);
                    room.storeCurrent.add(type as ResourceConstant, creep.store[type as ResourceConstant]);
                    return;
                }
                if (this.remainRun > 0) {
                    this.remainRun--;
                    this.status = "go";
                } else {
                    creep.suicide();
                }
            }
        }
    }

    static defaultBody: BodyPartDescription = [[CARRY, 25], [MOVE, 25]];
}


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

registerCommand("loot", "loot a structure without guards.", [
    { name: "flag", type: "string", description: "The flag to target." },
    { name: "home", type: "myRoom", description: "Where to send carriers. " }
], (flagName: string, home: string) => {
        const flag = Game.flags[flagName];
        if (flag) {
            const creepRun = _.floor((CREEP_LIFE_TIME - 100) / (2 * estimateDistance(
                flag.pos, new RoomPosition(myRooms[home].design.center.x, myRooms[home].design.center.y, home))))
            schedule("checkLoot", 1, { flag: flagName, home, creepRun });
        }
}
)
