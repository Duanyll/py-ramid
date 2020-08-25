import { RoomInfo, registerCallback } from "roomInfo";

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
            if (room.creepForRole[roleId] && room.creepForRole[roleId].ticksToLive > CREEP_LIFE_TIME - 10) {
                room.state.roleSpawnStatus[roleId] = "ok";
            }
            return;
        }
        if (!room.creepForRole[roleId] || room.creepForRole[roleId].ticksToLive <= getCreepSpawnTime(info.body)) {
            room.spawnQueue.push({
                name: `${room.name}-${roleId}-${Game.time}`,
                body: info.body,
                memory: { role: info.role, roleId: roleId, room: room.name }
            });
            room.state.roleSpawnStatus[roleId] = "spawning";
            return;
        }
    })
}

export function tickSpawn(room: RoomInfo) {
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
    if (req.cost <= room.detail.energyAvailable) {
        const spawn = _.find(room.structures.spawns, s => !s.spawning);
        if (!spawn) return;
        spawn.spawnCreep(expandBodypart(req.body), req.name, {
            memory: req.memory
        });
        console.log(`Spawning creep ${req.name}`);
        // room.stats.current.energy.spawnCost += req.cost;
        room.spawnQueue.shift();
        room.delay("checkRefill", 1);
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
}
registerCallback("checkRefill", checkRefillState);
