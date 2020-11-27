import { myRooms, RoomInfo } from "roomInfo";
import { globalDelay, registerGlobalRoutine } from "scheduler";
import { onVisibility } from "structures/observer";
import { estimateDistance } from "utils/utils";

Memory.mining = Memory.mining ||
    { power: { from: {}, targets: [], info: {} }, deposit: { from: {}, targets: [], info: {} } };

function canRoomHarvestPB(room: RoomInfo) {
    return room.structRcl == 8 && room.state.energyState == "take";
}

function scanPowerBank() {
    const pbInfo = Memory.mining.power.info;
    Memory.mining.power.targets.forEach(room => {
        onVisibility(room, () => {
            Game.rooms[room].find(FIND_STRUCTURES, { filter: { structureType: STRUCTURE_POWER_BANK } }).forEach(pb => {
                pb = pb as StructurePowerBank;
                if (!pbInfo[pb.id]) {
                    pbInfo[pb.id] = {
                        discoverTime: Game.time,
                        pos: { room: pb.pos.roomName, x: pb.pos.x, y: pb.pos.y },
                        status: "waiting"
                    }
                    if (!tryHarvestPB(pb)) {
                        pbInfo[pb.id].status = "dropped";
                    }
                }
            })
        })
    })
    globalDelay("scanPowerBank", 1000);
}
registerGlobalRoutine("scanPowerBank", scanPowerBank);

function tryHarvestPB(pb: StructurePowerBank) {
    let minDist = _.minBy(_.map(myRooms,
        room => {
            return {
                dis: canRoomHarvestPB(room) ? estimateDistance(room.structures.centerSpawn.pos, pb.pos) : Infinity,
                room
            }
        }), i => i.dis);
    if (pb.power > 1400 && minDist.dis <= 150 && pb.ticksToDecay > 3300) {
        goHarvestPB(pb, minDist.room, 2);
        return true;
    }
    if (pb.power > 2000 && minDist.dis <= 600 && pb.ticksToDecay > 4700) {
        goHarvestPB(pb, minDist.room, 3);
        return true;
    }
    return false;
}

function goHarvestPB(pb: StructurePowerBank, room: RoomInfo, waves: number) {
    // TODO: 生成 pb miner
}
