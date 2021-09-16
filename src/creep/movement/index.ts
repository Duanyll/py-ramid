import { movingCreeps } from "./data";
import { creepFlee } from "./flee";
import { checkFollowersReady, followCreep } from "./follow";
import { goToRoom, goTo } from "./goTo";

function processCreepMovement(creep: AnyCreep) {
    if (!creep.pos) return;
    if (creep.movement) {
        if (creep.movement.waitForFollowers && !checkFollowersReady(creep)) {
            return;
        }
        if ('fleeFrom' in creep.movement) {
            creepFlee(creep, creep.movement.fleeFrom);
        } else if ('following' in creep.movement) {
            const target = Game.creeps[creep.movement.following];
            if (target) followCreep(creep, target);
        } else if ('room' in creep.movement) {
            goToRoom(creep, creep.movement.room);
        } else {
            goTo(creep, creep.movement);
        }
    }
}

export function processMovement() {
    _.forIn(Game.creeps, processCreepMovement);
    _.forIn(Game.powerCreeps, processCreepMovement);
}

export { prepareMovement } from "./data";
import "./prototype";
