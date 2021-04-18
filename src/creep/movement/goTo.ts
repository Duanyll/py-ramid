import Logger from "utils";
import { moveBypass } from "./bypass";
import CostMatrixCache from "./costMatrix";
import { getFleeTargets } from "./flee";
import { findPath, findRouteCallback } from "./pathfinding";

function moveByPath(creep: AnyCreep, path: RoomPosition[], checkFlee?: boolean): boolean {
    var idx = _.findIndex(path, (i) => i.isEqualTo(creep.pos));
    if (idx == -1) {
        if (!path[0]?.isNearTo(creep.pos)) {
            return false;
        }
    }
    idx++;
    if (idx >= path.length) {
        return false;
    }

    if (checkFlee) {
        let fleeTargets = getFleeTargets(creep.pos, creep.movement?.fleeRange ?? 5);
        if (fleeTargets) return true;
    }

    return moveBypass(creep, creep.pos.getDirectionTo(path[idx]));
}

export function goTo(creep: AnyCreep, opts: GoToPosOpts, checkFlee?: boolean) {
    const pathReuse = (creep.pos.inRangeTo(opts.pos, 5)) ? 5 : 15;

    if (creep.pos.isEqualTo(opts.pos)) {
        return;
    }

    if (creep.pos.isNearTo(opts.pos)) {
        moveBypass(creep, creep.pos.getDirectionTo(opts.pos));
        return;
    }
    if (!creep.moveInfo || !creep.moveInfo.opts.pos.isEqualTo(opts.pos) || creep.moveInfo.time + pathReuse < Game.time) {
        creep.moveInfo = {
            opts,
            time: Game.time,
            path: findPath(creep, opts).path
        }
    }
    if (!moveByPath(creep, creep.moveInfo.path, checkFlee) && creep.moveInfo.time != Game.time && Game.time & 1) {
        creep.moveInfo = {
            opts,
            time: Game.time,
            path: findPath(creep, opts, true).path
        }
        moveByPath(creep, creep.moveInfo.path, checkFlee);
    }
}

export function goToRoom(creep: AnyCreep, room: string) {
    function reFindPath() {
        let route = Game.map.findRoute(creep.room, room, {
            routeCallback: findRouteCallback
        });
        if (route == ERR_NO_PATH) {
            Logger.error(`${creep.name}: No path to ${room}!`);
            return false;
        }
        creep.exitInfo = { target: room, route }
        return true;
    }
    if (!creep.exitInfo || creep.exitInfo.target != room || !creep.exitInfo.route) {
        if (!reFindPath()) return;
    }
    if (!creep.exitInfo.exitPos || creep.exitInfo.exitPos.roomName != creep.room.name) {
        if (creep.exitInfo.route == ERR_NO_PATH) return;
        let exit = creep.exitInfo.route.shift();
        let exits = Game.map.describeExits(creep.room.name);
        if (!exit || exit.room != exits[exit.exit]) {
            if (!reFindPath()) return;
            exit = creep.exitInfo.route.shift();
        }
        creep.exitInfo.exitPos = creep.pos.findClosestByPath(exit.exit, {
            costCallback: (room) => {
                return CostMatrixCache.get(room, "structure");
            }
        });
        if (!creep.exitInfo.exitPos) return;
    }
    goTo(creep, { pos: creep.exitInfo.exitPos, range: 0 });
}
