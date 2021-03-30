import { myRooms, RoomInfo } from "room/roomInfo";
import { globalDelay, registerGlobalRoutine, schedule } from "utils";
import { onVisibility } from "structures/observer";
import { estimateDistance, objToPos, posToObj } from "utils";
import Logger from "utils";
import cfg from "config";

Memory.mining ||= {} as any;
_.defaultsDeep(Memory.mining,
    { power: { roomLock: {}, targets: [], info: {} }, deposit: { from: {}, targets: [], info: {} } });

function canRoomHarvestPB(room: RoomInfo) {
    return room.structRcl == 8 && room.energy > cfg.ENERGY.LOW && !Memory.mining.power.roomLock[room.name];
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
    globalDelay("scanPowerBank");
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
            if (info.harvRoom) {
                delete Memory.mining.power.roomLock[info.harvRoom];
            }
        }
        if (info.status == "waiting") {
            tryHarvestPB(info, id);
        }
    })
    Memory.mining.power.info = newPBInfo;
    globalDelay("processPowerBank");
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
        goHarvestPB(pb, id, minDist.room, minDist.dis);
        return;
    }
    if (pb.power > 2000 && minDist.dis <= 600 && pb.decayTime - Game.time > 4700) {
        goHarvestPB(pb, id, minDist.room, minDist.dis);
        return;
    }
}

function goHarvestPB(pb: PowerBankInfo, id: string, room: RoomInfo, distance: number) {
    Logger.info(`Harvesting PowerBank in ${pb.pos.room}, from ${room.name}`);
    pb.distance = distance;
    pb.remainHits = POWER_BANK_HITS;
    pb.status = "harvesting";
    pb.harvRoom = room.name;
    Memory.mining.power.roomLock[room.name] = true;
    pb.harvGroupCount = 0;
    pb.carryGroup = `pbCarry-${id.substr(7, 8)}`;
    spawnPowerBankHarvestGroup(1, id, room.name, ++pb.harvGroupCount);
}

export function onPBHarvesterArrive(creep: Creep, info: PowerBankInfo, id: string) {
    const pb = Game.getObjectById(id) as StructurePowerBank;
    const creepAttack = 750 * (creep.ticksToLive + 1);
    info.remainHits = pb.hits - creepAttack;
    if (info.remainHits <= 0) {
        let finishTime = _.ceil(pb.hits / 750);
        let carrierCount = _.ceil(pb.power / 1250);
        spawnPowerBankCarryGroup(Math.max(1, finishTime - 150 * _.ceil(carrierCount / 3) - 50),
            id, info.harvRoom, info.carryGroup, carrierCount);
    } else {
        spawnPowerBankHarvestGroup(Math.max(1, creep.ticksToLive - 150 - info.distance),
            id, info.harvRoom, ++info.harvGroupCount);
    }
}

function spawnPowerBankHarvestGroup(time: number, id: string, room: string, wave: number) {
    const idShort = id.substr(7, 8);
    const groupName = `pbHarv-${idShort}-${wave}`;
    schedule("spawnCreep", time, {
        room,
        role: "pbHarv",
        param: {
            roleId: "attack",
            name: `${groupName}-attack`,
            memory: { target: id },
            group: groupName
        }
    });
    for (let i = 1; i <= 2; i++) {
        schedule("spawnCreep", time + 55, {
            room,
            role: "pbHeal",
            param: {
                roleId: `heal${i}`,
                name: `${groupName}-heal${i}`,
                memory: { target: id },
                group: groupName
            }
        })
    }
}
function spawnPowerBankCarryGroup(time: number, id: string, room: string, groupName: string, count: number) {
    for (let i = 1; i <= count; i++) {
        schedule("spawnCreep", time, {
            room,
            role: "pbCarry",
            param: {
                roleId: `carry${i}`,
                name: `${groupName}-carry${i}`,
                memory: { target: id, home: room, state: "go" } as any,
                group: groupName
            }
        })
    }
}
