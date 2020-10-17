import { RoomInfo, registerCallback, myRooms } from "roomInfo";
import { helperCreepCount, emergencyCreepBody } from "creepCount";

function getCreepSpawnTime(body: BodyPartDescription) {
    return _.sumBy(body, (p) => p.count) * 3;
}

function getCreepCost(body: BodyPartDescription) {
    return _.sumBy(body, (p) => BODYPART_COST[p.type] * p.count);
}

function expandBodypart(body: BodyPartDescription) {
    let res: BodyPartConstant[] = [];
    body.forEach((p) => {
        for (let i = 0; i < p.count; i++) res.push(p.type);
    });
    return res;
}

function checkCreepHealth(room: RoomInfo, roleId: string, body: BodyPartDescription, role: CreepRole, spawnRoom: RoomInfo = room) {
    let needSpawn = true;
    if (room.creepForRole[roleId]) {
        room.creepForRole[roleId].forEach(creep => {
            if (!creep.ticksToLive || creep.ticksToLive > getCreepSpawnTime(body)) {
                needSpawn = false;
                return;
            }
        })
    }
    if (needSpawn) {
        if (spawnRoom.spawnQueue.find(r => r.memory.roleId == roleId)) return;
        spawnRoom.spawnQueue.push({
            name: `${room.name}-${roleId}-${Game.time}`,
            body: body,
            memory: { role: role, room: room.name, roleId: roleId }
        })
    }
}

function checkHelpersHealth(room: RoomInfo) {
    let helperRoom = myRooms[room.helperRoom];
    let helperInfo = helperCreepCount[helperRoom.structRcl];
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
    let req = room.spawnQueue[0];
    if (Game.creeps[req.name]) {
        console.log(`Room ${room.name}: Trying to spawn a existing creep.`);
        room.spawnQueue.shift();
        return;
    }
    if (!req.cost) req.cost = getCreepCost(req.body);
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
            delete room.refillTargets[s.id];
        } else {
            room.refillTargets[s.id] = s.store.getFreeCapacity(RESOURCE_ENERGY);
        }
    }
    room.structures.extensions.forEach(f);
    room.structures.spawns.forEach(f);
    room.structures.towers.forEach(f);

    room.delay("checkRefill", 200);
}
registerCallback("checkRefill", checkRefillState);
