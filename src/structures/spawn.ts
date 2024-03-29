import { RoleEmergencyWorker, RoleWorker } from "room/roles/worker";
import { RoomInfo, registerRoomRoutine, myRooms } from "room/roomInfo";
import Logger from "utils";
import { registerTask } from "utils";
import { expandBodypart, getCreepCost, getCreepSpawnTime } from "utils";

function checkCreepHealth(room: RoomInfo, roleId: string, body: BodyPartDescription, role: CreepRoleType, spawnRoom: RoomInfo = room) {
    if (room.creepForRole[roleId]) {
        if (room.creepForRole[roleId].length >= 2) return;
        for (const creep of room.creepForRole[roleId]) {
            if (!creep.ticksToLive || creep.ticksToLive > getCreepSpawnTime(body)) {
                return;
            }
        }
    }
    if (spawnRoom.spawnQueue.find(r => r.memory.roleId == roleId)) return;
    spawnRoom.requestSpawn(role, { body, roleId, room: room.name })
}

function checkHelpersHealth(room: RoomInfo) {
    let helperRoom = myRooms[room.helperRoom];
    let helperInfo = RoleWorker.helperBody[helperRoom.structRcl];
    for (let i = 0; i < helperInfo.count; i++) {
        const roleId = `helper${i}`;
        checkCreepHealth(room, roleId, helperInfo.body, "work", helperRoom);
    }
}

export function tickSpawn(room: RoomInfo) {
    if (room.structRcl <= 2 && room.helperRoom) {
        checkHelpersHealth(room);
        return;
    }
    _.forIn(room.creepRoleDefs, (info, roleId) => checkCreepHealth(room, roleId, info.body, info.role));

    if (room.spawnQueue.length == 0) return;
    if (room.spawnQueue.length >= 3) {
        _.forEach(room.structures.spawns, s => room.requestPower(s, PWR_OPERATE_SPAWN));
    }
    let req = room.spawnQueue[0];
    if (Game.creeps[req.name]) {
        Logger.error(`Room ${room.name}: Trying to spawn a existing creep.`);
        room.spawnQueue.shift();
        return;
    }
    if (!req.cost) req.cost = getCreepCost(req.body);
    if (req.cost > room.detail.energyCapacityAvailable) {
        Logger.error("Trying to spawn a creep which is too big.");
        room.spawnQueue.shift();
    }
    if (req.cost <= room.detail.energyAvailable) {
        let spawn: StructureSpawn;
        let dir: DirectionConstant;
        if (req.memory.role == "manage") {
            spawn = room.structures.centerSpawn;
            if (spawn && spawn.spawning) return;
            dir = spawn.pos.getDirectionTo(room.design.center.x, room.design.center.y);
        } else {
            spawn = _.find(room.structures.spawns, s => !s.spawning);
            if (!spawn) return;
        }
        spawn.spawnCreep(expandBodypart(req.body), req.name, {
            memory: req.memory,
            directions: dir ? [dir] : undefined
        });
        Logger.silly(`Spawning creep ${req.name}`);
        delete room.state.refillFailTime;
        room.spawnQueue.shift();
        room.setTimeout("checkRefill", 1);
    } else {
        room.state.refillFailTime ||= 0;
        room.state.refillFailTime++;
        if (room.state.refillFailTime >= CREEP_LIFE_TIME && room.detail.energyAvailable >= SPAWN_ENERGY_START) {
            let spawn = room.structures.spawns[0];
            if (spawn && !spawn.spawning && room.creeps.length < 4) {
                spawn.spawnCreep(expandBodypart(RoleEmergencyWorker.defaultBody), `${room.name}-emergency-${Game.time}`, {
                    memory: {
                        room: room.name,
                        role: "emergency"
                    }
                });
            }
        }
    }
}

function checkRefillState(room: RoomInfo) {
    let totalRefill = 0;
    function f(s: RefillableStructure) {
        if (s.store.free("energy") == 0) {
            delete room.refillTargets[s.id];
        } else {
            room.refillTargets[s.id] = s.store.free("energy");
            totalRefill += room.refillTargets[s.id];
        }
    }
    room.structures.extensions.forEach(f);
    room.structures.spawns.forEach(f);
    room.structures.towers.forEach(s => {
        if (s.store.free("energy") == 0) {
            delete room.refillTargets[s.id];
        } else if (s.store.free("energy") > 200) {
            room.refillTargets[s.id] = s.store.free("energy");
            totalRefill += room.refillTargets[s.id];
        }
    });
    if (room.structures.storage && totalRefill > 2000) {
        room.requestPower(room.structures.storage, PWR_OPERATE_EXTENSION);
    } else {
        delete room.powerRequests[room.structures.storage?.id];
    }
}
registerRoomRoutine({
    id: "checkRefill",
    init: checkRefillState,
    invoke: checkRefillState,
});

registerTask("spawnCreep", (param) => {
    myRooms[param.room].requestSpawn(param.role, param.param);
});
