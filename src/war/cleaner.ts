import { creepRole, CreepRoleBase, memorize } from "creep/role";
import { myRooms } from "room/roomInfo";
import Logger, { registerCommand } from "utils/console";

@creepRole("cleaner")
export class RoleSimpleAttacker extends CreepRoleBase {
    @memorize
    targets: string[];
    work(creep: Creep) {
        let targetRoom = this.targets?.[0];
        creep.heal(creep);
        if (!targetRoom) return;
        if (creep.goToRoom(targetRoom)) {
            const flag = creep.room.find(FIND_FLAGS)[0];
            if (flag) {
                let s = flag.pos.lookFor(LOOK_STRUCTURES)[0];
                if (s) {
                    creep.goTo(s);
                    if (creep.pos.isNearTo(s) || creep.pos.getRangeTo(s) > 3) {
                        creep.rangedMassAttack();
                    } else {
                        creep.rangedAttack(s);
                    }
                } else {
                    flag.remove();
                    creep.room.updateMatrix();
                }
            } else {
                const spawn = creep.room.find(FIND_HOSTILE_SPAWNS)[0];
                if (spawn) {
                    creep.goTo(spawn);
                    if (creep.pos.isNearTo(spawn) || creep.pos.getRangeTo(spawn) > 3) {
                        creep.rangedMassAttack();
                    } else {
                        creep.rangedAttack(spawn);
                    }
                } else {
                    Logger.report(`Room ${targetRoom} cleaned.`);
                    this.targets.shift();
                    creep.room.updateMatrix();
                }
            }
        }
    }

    static defaultBody: BodyPartDescription =
        [[TOUGH, 6, "XGHO2"], [MOVE, 10, "XZHO2"], [RANGED_ATTACK, 19, "XKHO2"], [HEAL, 15, "XLHO2"]];
}


registerCommand('sendCleaner', 'Send a boosted (3 towers) cleaner creep to clean up target room', [
    { name: "home", type: "myRoom" },
    { name: "target", type: "any" }
], (home: string, targets: string[]) => {
        myRooms[home].requestSpawn("cleaner", {
            memory: { targets } as any
        });
});
