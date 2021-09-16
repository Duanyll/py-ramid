import { RoomInfo } from "room/roomInfo";
import cfg from "config";
import { creepRole, CreepRoleBase, memorize } from "../../creep/role";
import Logger from "utils";

@creepRole("xUpgrade")
export class RoleBoostedUpgrader extends CreepRoleBase {
    work(creep: Creep, room: RoomInfo) {
        if (!room.state.energy.usage.upgrade) return;
        const controller = room.structures.controller;
        if (creep.goTo(controller, 2)) {
            creep.upgradeController(controller);
            if (creep.store.energy <= creep.getActiveBodyparts("work")) {
                const link = room.structures.controllerLink;
                if (creep.goTo(link)) {
                    creep.withdraw(link, "energy");
                    if (link.store.energy < 200) {
                        room.setTimeout("runLinks", 1);
                    }
                }
            }
        }
    }

    static body: Record<number, BodyPartDescription> = {
        6: [[WORK, 20, "XGH2O"], [CARRY, 1], [MOVE, 5]],
        7: [[WORK, 38, "XGH2O"], [CARRY, 2], [MOVE, 10]],
        8: [[WORK, 38, "XGH2O"], [CARRY, 2], [MOVE, 10]]
    }

    static spawnInfo(room: RoomInfo) {
        if (room.structRcl >= 6
            && room.state.boostUpgrade
            && room.storeCurrent.get('XGH2O') > 10000
            && room.state.energy.usage.upgrade) {
            return {
                "upgr1": this.body[room.structRcl],
                "upgr2": this.body[room.structRcl]
            }
        }
    }
}

@creepRole("upgrade")
export class RoleUpgrader extends CreepRoleBase {
    @memorize
    status: "upgrade" | "pickup";

    @memorize
    sign: string;
    work(creep: Creep, room: RoomInfo) {
        this.status = this.status || "pickup";
        if (this.status == "upgrade" && creep.store.energy == 0) {
            this.status = "pickup";
        }
        if (this.status == "pickup" && creep.store.getFreeCapacity(RESOURCE_ENERGY) < 10) {
            this.status = "upgrade";
        }

        if (this.status == "pickup") {
            let target: AnyStoreStructure = room.structures.controllerLink;
            if (!target && room.structures.storage && !room.state.energy.storeMode) {
                target = room.structures.storage;
            }
            if (target) {
                if (creep.goTo(target)) {
                    creep.withdraw(target, RESOURCE_ENERGY);
                }
            } else {
                const sourceId = Number(_.last(creep.memory.roleId)) % 2;
                const source = room.structures.sources[sourceId];
                if (creep.goTo(source)) {
                    creep.harvest(source);
                }
            }
        } else {
            if (room.state.energy.usage.upgrade
                || room.structures.controller.level < 8
                || Game.time % 50 == 0
                || room.structures.controller.ticksToDowngrade < CONTROLLER_DOWNGRADE[room.structures.controller.level] - 10000)
                this.goUpgrade(creep, room);
        }
    }

    goUpgrade(creep: Creep, room: RoomInfo) {
        const c = room.structures.controller;
        if (creep.goTo(c, 2)) {
            creep.upgradeController(c);
            if (this.sign) {
                if (creep.goTo(c, 1)) {
                    creep.signController(c, this.sign);
                    Logger.info(`Sign room ${room.name}: ${this.sign}`);
                    this.sign = null;
                }
            }
        }
    }

    static body: Record<number, BodyPartDescription> = {
        1: [[WORK, 1], [CARRY, 2], [MOVE, 2]],
        2: [[WORK, 2], [CARRY, 2], [MOVE, 4]],
        3: [[WORK, 3], [CARRY, 5], [MOVE, 4]],
        4: [[WORK, 6], [CARRY, 7], [MOVE, 7]],
        5: [[WORK, 12], [CARRY, 4], [MOVE, 8]],
        6: [[WORK, 12], [CARRY, 4], [MOVE, 8]],
        7: [[WORK, 12], [CARRY, 4], [MOVE, 8]],
        8: [[WORK, 12], [CARRY, 4], [MOVE, 8]]
    }

    static bodyLow: BodyPartDescription = [[WORK, 3], [CARRY, 1], [MOVE, 2]];

    static spawnInfo(room: RoomInfo) {
        if (room.structRcl <= 3) {
            return {
                "upgr1": this.body[room.structRcl],
                "upgr2": this.body[room.structRcl]
            }
        } else if (!room.state.boostUpgrade) {
            if (room.structRcl <= 7) {
                return {
                    "upgr1": this.body[room.structRcl]
                }
            } else if (room.state.energy.usage.upgrade) {
                return {
                    "upgr1": this.body[8]
                }
            } else {
                return {
                    "upgr1": this.bodyLow
                }
            }
        }
    }
}
