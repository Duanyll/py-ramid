import { creepGroups } from "creep/creepInfo";
import { creepRole, CreepRoleBase, memorize } from "creep/role";
import { onPBHarvesterArrive } from "industry/highwayMining";
import { objToPos } from "utils";

@creepRole("pbHarv")
export class RolePowerHarvester extends CreepRoleBase {
    @memorize
    arrived: boolean;
    @memorize
    started: boolean;
    @memorize
    target: string;
    run(creep: Creep) {
        let pbInfo = Memory.mining.power.info[this.target];
        const tarpos = objToPos(pbInfo.pos);
        if (creep.goToRoom(tarpos.roomName) && creep.goTo(tarpos)) {
            if (!this.arrived) {
                this.arrived = true;
                pbInfo.distance = CREEP_LIFE_TIME - creep.ticksToLive;
            }
            const group = creep.group;
            if (group["heal1"]?.pos.isNearTo(creep.pos) && group["heal2"]?.pos.isNearTo(creep.pos)) {
                const pb = tarpos.lookFor(LOOK_STRUCTURES).find(s => s.structureType == STRUCTURE_POWER_BANK) as StructurePowerBank;
                if (!pb) {
                    pbInfo.status = "harvested";
                    delete Memory.mining.power.roomLock[pbInfo.harvRoom];
                    creep.suicide();
                    return;
                } else {
                    if (!this.started) {
                        this.started = true;
                        onPBHarvesterArrive(creep, pbInfo, this.target);
                    }
                    if (pb.hits < 5000 && creep.ticksToLive > 10) {
                        const carryGroup = creepGroups[pbInfo.carryGroup];
                        const carrierCount = _.ceil(pb.power / (CARRY_CAPACITY * 25));
                        const readyCount = _.values(carryGroup).filter(c => c.pos.inRangeTo(tarpos, 8)).length;
                        if (readyCount < carrierCount) return;
                    }
                    creep.attack(pb);
                    creep.posLock = true;
                }
            }
        }
    }

    static defaultBody: BodyPartDescription = [[MOVE, 25], [ATTACK, 25]]
}

@creepRole("pbHeal")
export class RolePowerHealer extends CreepRoleBase {
    @memorize
    target: string;
    run(creep: Creep) {
        let pbInfo = Memory.mining.power.info[this.target];
        const tarpos = objToPos(pbInfo.pos);
        if (creep.goToRoom(tarpos.roomName)) {
            let healTarget = creep.group["attack"];
            if (!healTarget && pbInfo.status == "harvested") {
                creep.suicide();
                return;
            }
            if (!healTarget) return;
            if (healTarget.pos.isNearTo(tarpos)) {
                if (creep.goTo(healTarget)) {
                    creep.posLock = true;
                    creep.heal(healTarget);
                }
            } else {
                if (creep.goTo(tarpos, 4)) {
                    creep.posLock = true;
                }
            }
        }
    }

    static defaultBody: BodyPartDescription = [[MOVE, 16], [HEAL, 16]]
}

@creepRole("pbCarry")
export class RolePowerCarrier extends CreepRoleBase {
    @memorize
    state: "go" | "back";
    @memorize
    target: string;
    run(creep: Creep) {
        let pbInfo = Memory.mining.power.info[this.target];
        const tarpos = objToPos(pbInfo.pos);
        if (this.state == "go") {
            if (creep.goToRoom(tarpos.roomName))
                if (pbInfo.status == "harvested") {
                    if (creep.goTo(tarpos)) {
                        const ruin = tarpos.lookFor(LOOK_RUINS)[0];
                        if (ruin) {
                            creep.withdraw(ruin, RESOURCE_POWER);
                            this.state = "back";
                        } else {
                            const resource = tarpos.lookFor(LOOK_RESOURCES).find(r => r.resourceType == RESOURCE_POWER);
                            if (resource) creep.pickup(resource);
                            this.state = "back";
                        }
                    }
                } else {
                    if (creep.goTo(tarpos, 4))
                        creep.posLock = true;
                }
        } else {
            const home = pbInfo.harvRoom
            let room = global.myRooms[home];
            let storage = room.whereToPut("power");
            if (creep.goToRoom(home) && creep.goTo(storage)) {
                creep.transfer(storage, RESOURCE_POWER);
                room.storeCurrent.add(RESOURCE_POWER, creep.store.power);
                creep.suicide();
            }
        }
    }

    static defaultBody: BodyPartDescription = [[MOVE, 25], [CARRY, 25]]
}
