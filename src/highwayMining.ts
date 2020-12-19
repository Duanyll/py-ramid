import { myRooms, RoomInfo } from "roomInfo";
import { globalDelay, registerGlobalRoutine, schedule } from "scheduler";
import { onVisibility } from "structures/observer";
import { estimateDistance, objToPos, posToObj } from "utils/utils";
import "roles/powerMiner";
import Logger from "utils/Logger";
import { pbCarrierBody, pbHarvesterBody, pbHealerBody } from "creepCount";

Memory.mining ||= {} as any;
_.defaultsDeep(Memory.mining,
    { power: { from: {}, targets: [], info: {} }, deposit: { from: {}, targets: [], info: {} } });

function canRoomHarvestPB(room: RoomInfo) {
    return room.structRcl == 8 && room.energy > 100000 && !Memory.mining.power.from[room.name];
}

function scanPowerBank() {
    // 典型 Bug: pbInfo 被 onVisibility 的回调捕获，但几个 tick 后这个位置的对象已经被销毁重建了
    // const pbInfo = Memory.mining.power.info;
    Memory.mining.power.targets.forEach(room => {
        onVisibility(room, () => {
            Game.rooms[room].find(FIND_STRUCTURES, { filter: { structureType: STRUCTURE_POWER_BANK } }).forEach(pb => {
                pb = pb as StructurePowerBank;
                if (!Memory.mining.power.info[pb.id]) {
                    Logger.info(`Discovered PowerBank in ${room}`)
                    Memory.mining.power.info[pb.id] = {
                        discoverTime: Game.time,
                        power: pb.power,
                        decayTime: Game.time + pb.ticksToDecay,
                        pos: posToObj(pb.pos),
                        status: "waiting"
                    }
                    globalDelay("processPowerBank", 1);
                }
            })
        })
    })
    globalDelay("scanPowerBank", 100);
}
registerGlobalRoutine("scanPowerBank", scanPowerBank);

function processPowerBank() {
    let newPBInfo: { [id: string]: PowerBankInfo } = {}
    _.forIn(Memory.mining.power.info, (info, id) => {
        // Logger.debug(`Processing PowerBank ${id}`)
        if (Game.time < info.decayTime + 1000) {
            newPBInfo[id] = info;
        } else {
            Logger.silly(`Removing old PowerBank in ${info.pos.room}`);
        }
        if (info.status == "waiting") {
            tryHarvestPB(info, id);
        }
    })
    Memory.mining.power.info = newPBInfo;
    globalDelay("processPowerBank", 100);
}
registerGlobalRoutine("processPowerBank", processPowerBank);

function tryHarvestPB(pb: PowerBankInfo, id: string) {
    if (pb.decayTime - Game.time <= 3300 || pb.power <= 1400) {
        Logger.debug(`Give up mining PowerBank in ${pb.pos.room}`);
        pb.status = "dropped";
    }
    let minDist = _.minBy(_.map(myRooms,
        room => {
            return {
                dis: canRoomHarvestPB(room) ? estimateDistance(room.structures.centerSpawn.pos, objToPos(pb.pos)) : Infinity,
                room
            }
        }), i => i.dis);
    if (pb.power > 1400 && minDist.dis <= 100 && pb.decayTime - Game.time > 3300) {
        goHarvestPB(pb, id, minDist.room, 2);
        return;
    }
    if (pb.power > 2000 && minDist.dis <= 600 && pb.decayTime - Game.time > 4700) {
        goHarvestPB(pb, id, minDist.room, 3);
        return;
    }
}

function goHarvestPB(pb: PowerBankInfo, id: string, room: RoomInfo, waves: number) {
    Logger.info(`Harvesting PowerBank in ${pb.pos.room}, from ${room.name}, need ${waves} waves of creep.`);
    pb.status = "spawnRequested";
    pb.harvRoom = room.name;
    Memory.mining.power.from[room.name] = id;
    pb.harvGroups = [];
    const idShort = id.substr(8, 8);
    let timeBase = 151;
    for (let i = 1; i <= waves; i++) {
        let groupName = `pbHarv-${idShort}-${i}`;
        pb.harvGroups.push(groupName);
        schedule("spawnCreep", timeBase - 50 * CREEP_SPAWN_TIME, {
            room: room.name,
            info: {
                name: `${idShort}-harv${i}`,
                body: pbHarvesterBody,
                memory: {
                    role: "pbHarv",
                    roleId: "attack",
                    group: groupName,
                    target: id
                }
            } as SpawnRequest
        });
        for (let j = 1; j <= 2; j++) {
            schedule("spawnCreep", timeBase - 32 * CREEP_SPAWN_TIME, {
                room: room.name,
                info: {
                    name: `${idShort}-heal${(i - 1) * 2 + j}`,
                    body: pbHealerBody,
                    memory: {
                        role: "pbHeal",
                        roleId: `heal${j}`,
                        group: groupName,
                        target: id
                    }
                } as SpawnRequest
            });
        }
        timeBase += CREEP_LIFE_TIME;
    }
    const carryGroupName = `pbCarry-${idShort}`;
    const carrierCount = _.ceil(pb.power / (25 * CARRY_CAPACITY));
    pb.carryGroup = carryGroupName;
    timeBase -= 600;
    for (let i = 1; i <= carrierCount; i++) {
        schedule("spawnCreep", timeBase - 50 * CREEP_SPAWN_TIME, {
            room: room.name,
            info: {
                name: `${idShort}-carry${i}`,
                body: pbCarrierBody,
                memory: {
                    role: "pbCarry",
                    roleId: `carry${i}`,
                    group: carryGroupName,
                    target: id,
                    status: "go"
                }
            } as SpawnRequest
        })
    }
}

global.pbMining = (rooms: string[] | "clear") => {
    if (rooms == "clear") {
        Memory.mining.power.targets = [];
    } else {
        Memory.mining.power.targets.push(...rooms);
        globalDelay("scanPowerBank", 1);
        globalDelay("processPowerBank", 1);
    }
}
