import { dx, dy } from "utils/constants";
import { getObstacle } from "./bypass";
import { isCreepMoving } from "./data";
import { goTo } from "./goTo";

export function checkFollowersReady(creep: AnyCreep) {
    if (creep.pos.isOnEdge()) return true;
    if (creep.movement.followedBy) {
        let c = Game.creeps[creep.movement.followedBy];
        if (!c) return true;
        if (!c.pos.isNearTo(creep.pos)) return false;
    }
    return true;
}

function stepUp(creep: AnyCreep) {
    for (let i = 0; i < 8; i++) {
        let vx = creep.pos.x + dx[i];
        let vy = creep.pos.y + dy[i];
        if (vx > 0 && vx < 49 && vy > 0 && vy < 49) {
            let tarPos = new RoomPosition(vx, vy, creep.pos.roomName);
            if (tarPos.lookFor('terrain')[0] == "wall") continue;
            let obstacle = getObstacle(tarPos);
            if (obstacle) continue;
            creep.move(creep.pos.getDirectionTo(tarPos));
            return;
        }
    }
}

export function followCreep(creep: AnyCreep, target: AnyCreep) {
    if (creep.pos.isNearTo(target)) {
        if (creep.pos.isOnEdge() && !isCreepMoving(target)) {
            stepUp(creep);
        } else {
            creep.move(creep.pos.getDirectionTo(target));
        }
        return;
    }
    if (target.pos.isOnEdge()) {
        let exit = target.pos.getOppositeExit();
        if (creep.pos.isEqualTo(exit)) return;
        if (creep.pos.isNearTo(exit)) {
            creep.move(creep.pos.getDirectionTo(exit));
            return;
        }
    }
    goTo(creep, { pos: target.pos }, false);
}

