import { creepRole, CreepRoleBase, memorize } from "creep/role";
import { objToPos } from "utils";
import { depoHarvesterArrived } from "./depoMining";

@creepRole("depoHarv")
export class RoleDepositHarvester extends CreepRoleBase {
    @memorize
    arrived: boolean;
    @memorize
    target: string;
    work(creep: Creep) {
        let info = Memory.mining.deposit.info[this.target];
        const tarPos = objToPos(info.pos);
        if (creep.goToRoom(tarPos.roomName) && creep.goTo(tarPos)) {
            const depo = tarPos.lookFor(LOOK_DEPOSITS)[0];
            if (!depo) return;
            if (!this.arrived) {
                this.arrived = true;
                depoHarvesterArrived(creep, info, depo.id);
            }
            const group = creep.group;
            if (creep.store.free() >= 24 && !depo.cooldown) {
                creep.harvest(depo);
                creep.say('💨', true);
            }
            if (creep.store.tot() >= 50 || creep.ticksToLive < 20 && creep.store.tot()) {
                if ("cont" in group && creep.pos.isNearTo(group["cont"])) {
                    creep.transfer(group["cont"], depo.depositType);
                } else if ("carry" in group && creep.pos.isNearTo(group["carry"])) {
                    creep.transfer(group["carry"], depo.depositType);
                }
            }
        }
    }

    static defaultBody: BodyPartDescription = [[MOVE, 24], [CARRY, 2], [WORK, 24]]
}

@creepRole("depoContainer")
export class RoleDepositContainer extends CreepRoleBase {
    @memorize
    target: string;
    work(creep: Creep) {
        let info = Memory.mining.deposit.info[this.target];
        const tarPos = objToPos(info.pos);
        if (creep.goToRoom(tarPos.roomName)) {
            let harvCreep = creep.group["harv"];
            if (!harvCreep) return;
            if (harvCreep.pos.isNearTo(tarPos)) {
                if (creep.goTo(harvCreep)) {
                    creep.posLock = true;
                }
            } else {
                if (creep.goTo(tarPos, 4)) {
                    creep.posLock = true;
                }
            }
        }
    }

    static defaultBody: BodyPartDescription = [[CARRY, 49], [MOVE, 1]]
}

@creepRole("depoCarry")
export class RolePowerCarrier extends CreepRoleBase {
    @memorize
    state: "go" | "back";
    @memorize
    target: string;
    work(creep: Creep) {
        let info = Memory.mining.deposit.info[this.target];
        const tarPos = objToPos(info.pos);
        if (this.state == "go") {
            if (creep.goToRoom(tarPos.roomName)) {
                if (creep.ticksToLive <= info.distance + 15 || creep.store.free() < 24) {
                    this.state = "back";
                    return;
                }
                let dropped = tarPos.findInRange(FIND_DROPPED_RESOURCES, 5).find(r => r.resourceType == info.type);
                if (dropped) {
                    if (creep.goTo(dropped)) {
                        creep.pickup(dropped);
                    }
                } else if ("cont" in creep.group) {
                    let container = creep.group["cont"];
                    if (creep.goTo(container)) {
                        if (container.ticksToLive < 10 && container.store.tot(info.type)
                            || container.store.tot(info.type) > creep.store.free(info.type)
                            || creep.ticksToLive < info.distance + 20) {
                            container.transfer(creep, info.type);
                        }
                    }
                } else if ("harv" in creep.group) {
                    let harv = creep.group["harv"];
                    if (creep.goTo(harv)) {
                        creep.posLock = true;
                    }
                } else {
                    this.state = "back";
                }
            }
        } else {
            const home = info.harvRoom
            let room = global.myRooms[home];
            let storage = room.whereToPut(info.type);
            if (creep.goToRoom(home) && creep.goTo(storage)) {
                creep.transfer(storage, info.type);
                room.storeCurrent.add(info.type, creep.store[info.type]);
                if (creep.ticksToLive > info.distance * 2) {
                    this.state = "go";
                } else {
                    creep.suicide();
                }
            }
        }
    }

    static defaultBody: BodyPartDescription = [[MOVE, 25], [CARRY, 25]]
}
