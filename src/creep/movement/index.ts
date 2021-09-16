import { WAR_ROLES } from "utils/constants";
import { movingCreeps } from "./data";
import { creepFlee, getFleeTargets } from "./flee";
import { checkFollowersReady, followCreep } from "./follow";
import { goToRoom, goTo } from "./goTo";

function processCreepMovement(creep: AnyCreep) {
    if (!creep.pos) return;
    if (creep.movement.waitForFollowers && !checkFollowersReady(creep)) {
        return;
    }
    if (!(creep.movement?.fleeRange)) {
        let targets = getFleeTargets(creep.pos, creep.movement?.fleeRange ?? 5);
        if (targets?.length) {
            creepFlee(creep, targets.map(c => c.pos));
            return;
        }
    }
    if (creep.movement) {
        if ('following' in creep.movement) {
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
