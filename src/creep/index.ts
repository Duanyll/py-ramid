import { RoomInfo } from "room/roomInfo";
import Logger, { ErrorMapper } from "utils";
import { getFleeTargets } from "war/intelligence";
import { getCreepBoosted } from "./boost";
import { CreepRoleDriver, getCreepRole } from "./role";

let creepDrivers = {} as Record<string, CreepRoleDriver>;

export function runCreep(creep: Creep, room?: RoomInfo) {
    if (creep.spawning) return;
    if (creep.memory.boost?.length) {
        getCreepBoosted(creep);
        return;
    }
    let driver = creepDrivers[creep.name];
    if (!driver) {
        let ctor = getCreepRole(creep.memory.role);
        if (!ctor) {
            Logger.error(`${creep.name}: unknown creep role ${creep.memory.role}`);
        }
        driver = creepDrivers[creep.name] = new ctor(creep.name);
    }
    ErrorMapper.wrap(() => driver.tick(creep, room))();
}

export function clearCreepMemory() {
    for (const name in creepDrivers) {
        if (!(name in Game.creeps)) {
            creepDrivers[name].die?.();
            delete creepDrivers[name];
            delete Memory.creeps[name];
        }
    }
}
