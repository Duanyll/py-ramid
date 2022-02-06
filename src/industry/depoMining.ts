import cfg from "config";
import { estimateDistance } from "creep/movement/pathFinding";
import { myRooms, RoomInfo } from "room/roomInfo";
import { onVisibility } from "structures/observer";
import Logger, { setTimeout, registerGlobalRoutine, schedule, posToObj, objToPos } from "utils";

_.defaultsDeep(Memory.mining, { deposit: { roomLock: {}, targets: [], info: {} } })

function scanDeposit() {
    for (const roomName of Memory.mining.deposit.targets) {
        onVisibility(roomName, () => {
            const room = Game.rooms[roomName];
            room.find(FIND_DEPOSITS).forEach(depo => {
                if (!(depo.id in Memory.mining.deposit.info)) {
                    Logger.info(`Discovered deposit in ${roomName}`);
                    Memory.mining.deposit.info[depo.id] = {
                        discoverTime: Game.time,
                        decayTime: Game.time + depo.ticksToDecay,
                        type: depo.depositType,
                        pos: posToObj(depo.pos),
                        lastCooldown: depo.lastCooldown,
                        status: "waiting",
                        harvGroupSent: 0
                    }
                    setTimeout("processDeposit", 1);
                }
            })
        })
    }
    setTimeout("scanDeposit");
}
registerGlobalRoutine("scanDeposit", scanDeposit);

function processDeposit() {
    let newDepoInfo: { [id: string]: DepositInfo } = {}
    _.forIn(Memory.mining.deposit.info, (info, id) => {
        if (info.status == 'harvesting' || ('decayTime' in info) && Game.time < info.decayTime + 1000) {
            newDepoInfo[id] = info;
        } else {
            Logger.silly(`Removing old Deposit in ${info.pos.room}`);
            if (info.harvRoom) {
                delete Memory.mining.deposit.roomLock[info.harvRoom];
            }
        }
        if (info.status == "waiting") {
            tryHarvestDepo(info, id);  
        }
    });
    Memory.mining.deposit.info = newDepoInfo;
    setTimeout("processDeposit");
}
registerGlobalRoutine("processDeposit", processDeposit);

function tryHarvestDepo(depo: DepositInfo, id: string) {
    if (depo.lastCooldown && depo.lastCooldown > cfg.DEPO_CD_THRESHOLD) depo.status = "finished";
    let minDist = _.minBy(_.map(myRooms,
        room => {
            return {
                dis: room.structRcl == 8 ? estimateDistance(room.structures.centerSpawn.pos, objToPos(depo.pos)) : Infinity,
                room
            }
        }), i => i.dis);
    if (minDist.dis <= 350 && Game.time + 500 <= depo.decayTime) {
        goHarvestDepo(depo, id, minDist.room, minDist.dis);
    }
}

function goHarvestDepo(depo: DepositInfo, id: string, room: RoomInfo, dis: number) {
    Logger.info(`Harvesting Deposit in ${depo.pos.room}, from ${room.name}`);
    delete depo.decayTime;
    depo.distance = dis;
    depo.status = "harvesting";
    depo.harvRoom = room.name;
    Memory.mining.deposit.roomLock[room.name] = true;
    depo.harvGroupSent++;
    let groupName = `depo-${id.substr(7, 8)}-1`;
    room.requestSpawn("depoHarv", {
        roleId: "harv",
        name: `${groupName}-harv`,
        memory: { target: id },
        group: groupName
    })
    room.requestSpawn("depoContainer", {
        roleId: "cont",
        name: `${groupName}-cont`,
        memory: { target: id },
        group: groupName
    })
    schedule("spawnCreep", dis + 30, {
        room: room.name,
        role: "depoCarry",
        param: {
            roleId: "carry",
            name: `${groupName}-carry`,
            memory: { target: id, home: room.name, state: "go" } as any,
            group: groupName
        }
    })
}

export function depoHarvesterArrived(creep: Creep, info: DepositInfo, id: string) {
    const depo = Game.getObjectById(id) as Deposit;
    info.lastCooldown = depo.lastCooldown;
    info.distance = CREEP_LIFE_TIME - creep.ticksToLive;
    if (info.lastCooldown <= cfg.DEPO_CD_THRESHOLD) {
        info.harvGroupSent++;
        let groupName = `depo-${id.substr(7, 8)}-${info.harvGroupSent}`;
        schedule("spawnCreep", creep.ticksToLive - 150 - info.distance, {
            room: info.harvRoom,
            role: "depoHarv",
            param: {
                roleId: "harv",
                name: `${groupName}-harv`,
                memory: { target: id },
                group: groupName
            }
        });
        let body: BodyPartDescription;
        let time: number;
        if (info.harvGroupSent <= 5) {
            body = [[MOVE, 25], [CARRY, 25]];
            time = 150;
        } else if (info.harvGroupSent <= 12) {
            body = [[MOVE, 15], [CARRY, 15]];
            time = 90;
        } else {
            body = [[MOVE, 12], [CARRY, 12]];
            time = 72;
        }
        schedule("spawnCreep", creep.ticksToLive + 30 - time, {
            room: info.harvRoom,
            role: "depoCarry",
            param: {
                body,
                roleId: "carry",
                name: `${groupName}-carry`,
                memory: { target: id, home: info.harvRoom, state: "go" } as any,
                group: groupName
            }
        })
    } else {
        info.status = "finished";
        delete Memory.mining.deposit.roomLock[info.harvRoom];
        info.decayTime = Game.time + DEPOSIT_DECAY_TIME;
    }
}
