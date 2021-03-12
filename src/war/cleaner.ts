import { registerCreepRole } from "creep/roles";
import { myRooms } from "room/roomInfo";
import Logger, { registerCommand } from "utils/console";

interface CleanerMemory extends CreepMemory {
    targets: string[]
}
function runCleaner(creep: Creep) {
    const m = creep.memory as CleanerMemory;
    let targetRoom = m.targets?.[0];
    creep.heal(creep);
    if (!targetRoom) return;
    if (creep.goToRoom(targetRoom)) {
        const spawn = creep.room.find(FIND_HOSTILE_SPAWNS)[0];
        if (spawn) {
            creep.goTo(spawn);
            if (creep.pos.isNearTo(spawn) || creep.pos.getRangeTo(spawn) > 3) {
                creep.rangedMassAttack();
            } else {
                creep.rangedAttack(spawn);
            }
        } else {
            Logger.report(`Room ${targetRoom} cleaned.`)
            m.targets.shift();
        }
    }
}
registerCreepRole({ cleaner: runCleaner });

registerCommand('sendCleaner', 'Send a boosted (3 towers) cleaner creep to clean up target room', [
    { name: "home", type: "myRoom" },
    { name: "target", type: "any" }
], (home: string, targets: string[]) => {
        myRooms[home].requestSpawn("cleaner", {
            memory: { targets } as any
        });
});
