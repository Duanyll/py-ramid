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
