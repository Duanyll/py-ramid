import { RoomInfo, registerCallback, managedRooms } from "roomInfo";
import { helperCreepCount, emergencyCreepBody } from "creepCount";

function getCreepSpawnTime(body: BodyPartDescription) {
    return _.sum(body, (p) => p.count) * 3;
}

function getCreepCost(body: BodyPartDescription) {
    return _.sum(body, (p) => BODYPART_COST[p.type] * p.count);
}

function expandBodypart(body: BodyPartDescription) {
    let res: BodyPartConstant[] = [];
    body.forEach((p) => {
        for (let i = 0; i < p.count; i++) res.push(p.type);
    });
    return res;
}

function checkCreepHealth(room: RoomInfo) {
    _.forIn(room.creepRoleDefs, (info, roleId) => {
        if (room.state.roleSpawnStatus[roleId] == "disabled") return;
        if (room.state.roleSpawnStatus[roleId] == "spawning") {
            if (room.creepForRole[roleId] && room.creepForRole[roleId].ticksToLive > CREEP_LIFE_TIME - 1000) {
                room.state.roleSpawnStatus[roleId] = "ok";
            }
            return;
        }
        if (!room.creepForRole[roleId] || room.creepForRole[roleId].ticksToLive <= getCreepSpawnTime(info.body)) {
            room.spawnQueue.push({
                name: `${room.name}-${roleId}-${Game.time}`,
                body: info.body,
                memory: { role: info.role, roleId, room: room.name }
            });
            room.state.roleSpawnStatus[roleId] = "spawning";
            return;
        }
    })
}

function checkHelpersHealth(room: RoomInfo) {
    let helperRoom = managedRooms[room.helperRoom];
    let herperInfo = helperCreepCount[helperRoom.structRcl];
    for (let i = 0; i < herperInfo.count; i++) {
        const roleId = `helper${i}`;
        if (room.state.roleSpawnStatus[roleId] == "spawning") {
            if (room.creepForRole[roleId] && room.creepForRole[roleId].ticksToLive > CREEP_LIFE_TIME - 1000) {
                room.state.roleSpawnStatus[roleId] = "ok";
            }
            return;
        }
        if (!room.creepForRole[roleId] || room.creepForRole[roleId].ticksToLive <= getCreepSpawnTime(herperInfo.body)) {
            helperRoom.spawnQueue.push({
                name: `${room.name}-${roleId}-${Game.time}`,
                body: herperInfo.body,
                memory: { role: "work", roleId, room: room.name }
            });
            room.state.roleSpawnStatus[roleId] = "spawning";
            return;
        }
    }
}

export function tickSpawn(room: RoomInfo) {
    if (room.structRcl <= 2 && room.helperRoom) {
        checkHelpersHealth(room);
        return;
    }
    checkCreepHealth(room);

    if (room.spawnQueue.length == 0) return;
    let req = room.spawnQueue[0];
    if (Game.creeps[req.name]) {
        console.log(`Room ${room.name}: Trying to spawn a existing creep.`);
        room.spawnQueue.shift();
        return;
    }
    if (!req.cost) req.cost = getCreepCost(req.body);
    // console.log(`To spawn ${req.name} costs ${req.cost} energy. ${room.detail.energyAvailable} energy available`)
    if (req.cost > room.detail.energyCapacityAvailable) {
        console.log("Trying to spawn a creep which is too big.");
        room.spawnQueue.shift();
    }
    if (req.cost <= room.detail.energyAvailable) {
        let spawn: StructureSpawn;
        let dir: DirectionConstant;
        if (req.memory.role == "manage") {
            spawn = room.structures.centerSpawn;
            if (spawn.spawning) return;
            dir = spawn.pos.getDirectionTo(room.design.center[0], room.design.center[1]);
        } else {
            spawn = _.find(room.structures.spawns, s => !s.spawning);
            if (!spawn) return;
        }
        spawn.spawnCreep(expandBodypart(req.body), req.name, {
            memory: req.memory,
            directions: dir ? [dir] : undefined
        });
        console.log(`Spawning creep ${req.name}`);
        delete room.state.refillFailTime;
        // room.stats.current.energy.spawnCost += req.cost;
        room.spawnQueue.shift();
        room.delay("checkRefill", 1);
    } else {
        room.state.refillFailTime = room.state.refillFailTime || 0;
        room.state.refillFailTime++;
        if (room.state.refillFailTime >= CREEP_LIFE_TIME && room.detail.energyAvailable >= SPAWN_ENERGY_START) {
            let spawn = room.structures.spawns[0];
            if (spawn && !spawn.spawning) {
                spawn.spawnCreep(expandBodypart(emergencyCreepBody), `${room.name}-emergency-${Game.time}`, {
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
    function f(s: RefillableStructure) {
        if (s.store.getFreeCapacity(RESOURCE_ENERGY) == 0) {
            delete room.state.refillState[s.id];
        } else {
            room.state.refillState[s.id] = s.store.getFreeCapacity(RESOURCE_ENERGY);
        }
    }
    room.structures.extensions.forEach(f);
    room.structures.spawns.forEach(f);
    room.structures.towers.forEach(f);

    room.delay("checkRefill", 200);
}
registerCallback("checkRefill", checkRefillState);
