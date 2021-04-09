import Logger from "utils";
import { offsetsByDirection } from "utils/constants";
import { isHostile } from "war/intelligence";
import { shouldDoBypassCreep } from "./bypass";
import CostMatrixCache from "./costMatrix";
import { findPath, findRouteCallback } from "./pathfinding";

function getObstacle(pos: RoomPosition): RoomObject {
    for (const s of pos.lookFor("structure")) {
        switch (s.structureType) {
            case "road":
            case "container":
                return s;
            case "rampart":
                if ((s as any).my || (s as any).isPublic) {
                    break;
                }
                return s;
            default:
                return s;
        }
    }

    for (const s of pos.lookFor("constructionSite")) {
        if (!isHostile(s.owner.username)) {
            switch (s.structureType) {
                case "road":
                case "container":
                case "rampart":
                    break;
                default:
                    return s;
            }
        }
    }

    return pos.lookFor("creep")[0] || pos.lookFor("powerCreep")[0];
}

function moveBypass(creep: AnyCreep, target: DirectionConstant): boolean {
    function getTargetpos(pos: RoomPosition, dir: DirectionConstant) {
        let x = pos.x + offsetsByDirection[dir][0];
        let y = pos.y + offsetsByDirection[dir][1];
        if (x < 0 || x > 49 || y < 0 || y > 49) return undefined;
        return new RoomPosition(x, y, pos.roomName);
    }
    let tarpos = getTargetpos(creep.pos, target);
    if (tarpos) {
        let obstacle = getObstacle(tarpos);
        if (obstacle instanceof Creep || obstacle instanceof PowerCreep) {
            if (shouldDoBypassCreep(creep, obstacle)) {
                obstacle.move(((target + 3) % 8 + 1) as DirectionConstant);
            }
        } else {
            return false;
        }
    }

    creep.move(target as any);
    return true;
}

function moveByPath(creep: AnyCreep, path: RoomPosition[]): boolean {
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

    return moveBypass(creep, creep.pos.getDirectionTo(path[idx]));
}

export function goTo(creep: AnyCreep, opts: GoToPosOpts) {
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
    if (!moveByPath(creep, creep.moveInfo.path) && creep.moveInfo.time != Game.time && Game.time & 1) {
        creep.moveInfo = {
            opts,
            time: Game.time,
            path: findPath(creep, opts, true).path
        }
        moveByPath(creep, creep.moveInfo.path);
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
