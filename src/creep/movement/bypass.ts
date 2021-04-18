import Logger from "utils";
import { offsetsByDirection } from "utils/constants";
import { isHostile } from "war/intelligence";
import { movingCreeps, creepPostionLock } from "./data";

export function canBypassCreep(i: AnyCreep, creep: AnyCreep) {
    if (!creep.my) return false;
    if (creep.memory.role == "manage") return false;
    if (i.memory.role == creep.memory.role) return false;
    if (movingCreeps[creep.name]) return true;
    if (creepPostionLock[creep.name]) return false;
    return true;
}

export function shouldDoBypassCreep(i: AnyCreep, creep: AnyCreep) {
    if (creep.fatigue) return false;
    if (!creep.my) return false;
    if (creep.memory.role == "manage") return false;
    if (i.memory.role == creep.memory.role) return false;
    if (movingCreeps[creep.name] || creepPostionLock[creep.name]) return false;
    return true;
}

function wrapPositionLockFunc(funcName: keyof Creep["prototype"]) {
    const func = Creep.prototype[funcName] as (this: Creep, ...param: any) => ScreepsReturnCode;
    (Creep.prototype as any)[funcName] = function (this: Creep, ...param: any) {
        let res = func.call(this, ...param);
        if (res == OK) {
            this.posLock = true;
        }
        return res;
    }
}
// wrapPositionLockFunc("build");
// wrapPositionLockFunc("repair");
wrapPositionLockFunc("upgradeController");
wrapPositionLockFunc("harvest");
wrapPositionLockFunc("reserveController");


function getObstacle(pos: RoomPosition): RoomObject {
    for (const s of pos.lookFor("structure")) {
        switch (s.structureType) {
            case "road":
            case "container":
                break;
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

export function moveBypass(creep: AnyCreep, target: DirectionConstant): boolean {
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
        } else if (obstacle) {
            Logger.debug(`creep ${creep.name} meet obstacle ${obstacle} at ${tarpos}!`)
            return false;
        }
    }

    creep.move(target as any);
    return true;
}
