import { RoomInfo, registerCallback } from "roomInfo";
import { Console } from "console";

function checkCreepHealth(room: RoomInfo, roleId: string) {
    if (!room.creepRoleDefs[roleId]) return;
    function doSpawn() {
        room.spawnQueue.push({
            name: `${room.name}-${roleId}`,
            body: room.creepRoleDefs[roleId].body,
            memory: {
                role: room.creepRoleDefs[roleId].role,
                room: room.name,
                roleId: roleId
            }
        });
    }
    if (!room.creepForRole[roleId]) {
        doSpawn();
        return;
    }
    let creep = room.creepForRole[roleId];
    const spawnTime = getCreepSpawnTime(room.creepRoleDefs[roleId].body);
    if (creep.ticksToLive <= spawnTime) {
        doSpawn();
        return;
    }
    const nextCheckTime = Math.min(creep.ticksToLive - spawnTime, 300) + Game.time;
    room.scheduleEvent(nextCheckTime, { type: "checkCreepHealth", param: [roleId] })
}
registerCallback("checkCreepHealth", checkCreepHealth);

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

export function tickSpawn(room: RoomInfo) {
    if (room.spawnQueue.length == 0) return;
    let req = room.spawnQueue[0];
    if (Game.creeps[req.name]) {
        room.spawnQueue.push(room.spawnQueue.shift());
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
        if (req.memory.roleId) {
            room.scheduleEvent(Game.time + getCreepSpawnTime(req.body) + 1, { type: "checkCreepHealth", param: [req.memory.roleId] });
        }
        room.spawnQueue.shift();
        room.scheduleEvent(Game.time + 1, { type: "checkRefill" });
    }
}
