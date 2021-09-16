import { RoomInfo } from "room/roomInfo";
import { creepRole, CreepRoleBase, memorize } from "../../creep/role";
import { RoleBuilder } from "./builder";
import { RoleCarrier } from "./carrier";
import { RoleUpgrader } from "./upgrader";

@creepRole("work")
export class RoleWorker extends CreepRoleBase {
    @memorize
    status: "pickup" | "refill" | "build"
    work(creep: Creep, room: RoomInfo) {
        if (!creep.goToRoom(room.name)) return;
        if (!this.status) this.status = "pickup";
        if ((this.status == "build" || this.status == "refill") && creep.store.energy == 0) {
            this.status = "pickup";
        }
        if (this.status == "pickup" && creep.store.free("energy") < 10) {
            if (!_.isEmpty(room.refillTargets)) {
                this.status = "refill";
            } else {
                this.status = "build";
            }
        }
        if (this.status == "pickup") {
            let ruin = room.detail.find(FIND_TOMBSTONES).filter(t => t.store.energy > 0)[0]
                || room.detail.find(FIND_RUINS).filter(r => r.store.energy > 0)[0];
            if (ruin) {
                if (creep.goTo(ruin)) {
                    creep.withdraw(ruin, "energy");
                }
                return;
            }
            const sourceId = Number(_.last(creep.memory.roleId)) % 2;
            const target = room.structures.sources[sourceId];
            if (creep.goTo(target)) {
                creep.harvest(target);
            }
            return;
        }
        if (this.status == "refill") {
            if (RoleCarrier.prototype.goRefill.call(this, creep, room)) return;
        }
        if (room.detail.controller.ticksToDowngrade < 5000) {
            RoleUpgrader.prototype.goUpgrade.call(this, creep, room); return;
        }
        if (RoleBuilder.prototype.goBuild.call(this, creep, room)) return;
        RoleUpgrader.prototype.goUpgrade.call(this, creep, room);
    }

    static body: Record<number, BodyPartDescription> = {
        1: [[WORK, 1], [CARRY, 2], [MOVE, 2]],
        2: [[WORK, 2], [CARRY, 2], [MOVE, 4]],
        3: [[WORK, 3], [CARRY, 5], [MOVE, 4]],
        4: [[WORK, 6], [CARRY, 7], [MOVE, 7]],
        5: [[WORK, 6], [CARRY, 7], [MOVE, 7]],
        6: [[WORK, 6], [CARRY, 7], [MOVE, 7]],
        7: [[WORK, 10], [CARRY, 10], [MOVE, 10]],
        8: [[WORK, 10], [CARRY, 10], [MOVE, 10]]
    };

    static spawnInfo(room: RoomInfo) {
        if (room.structRcl < 4) {
            return {
                "work1": this.body[room.structRcl],
                "work2": this.body[room.structRcl],
                "work3": this.body[room.structRcl],
                "work4": this.body[room.structRcl],
            }
        }
    }

    static helperBody: {
        [rcl: number]: {
            count: number;
            body: BodyPartDescription
        }
    } = {
        3: { count: 4, body: [[WORK, 3], [CARRY, 5], [MOVE, 4]] },
        4: { count: 2, body: [[WORK, 6], [CARRY, 7], [MOVE, 7]] },
        5: { count: 2, body: [[WORK, 6], [CARRY, 7], [MOVE, 7]] },
        6: { count: 2, body: [[WORK, 6], [CARRY, 7], [MOVE, 7]] },
        7: { count: 2, body: [[WORK, 10], [CARRY, 10], [MOVE, 10]] },
        8: { count: 2, body: [[WORK, 10], [CARRY, 10], [MOVE, 10]] },
    }
}

@creepRole("emergency")
export class RoleEmergencyWorker extends CreepRoleBase {
    @memorize
    status: "pickup" | "refill" | "build";

    work(creep: Creep, room: RoomInfo) {
        if (!this.status) this.status = "pickup";
        if (this.status == "refill" && creep.store.energy == 0) {
            this.status = "pickup";
        }
        if (this.status == "pickup" && creep.store.getFreeCapacity("energy") < 10) {
            if (room.structures.controller.ticksToDowngrade < 5000) {
                this.status = "build"
            } else {
                this.status = "refill"
            }
        }
        if (this.status == "pickup") {
            let st = room.detail.find(FIND_TOMBSTONES).filter(t => t.store.energy > 0)[0]
                || room.detail.find(FIND_RUINS).filter(r => r.store.energy > 0)[0]
                || (room.structures.terminal?.store.energy > 0) ? room.structures.terminal : room.structures.storage;
            if (st && st.store.energy > 0) {
                if (creep.goTo(st)) {
                    creep.withdraw(st, "energy");
                }
                return;
            }
            const target = room.structures.sources[0];
            if (creep.goTo(target)) {
                creep.harvest(target);
            }
            return;
        }
        if (this.status == "build") {
            RoleUpgrader.prototype.goUpgrade.call(this, creep, room);
        } else {
            if (!RoleCarrier.prototype.goRefill.call(this, creep, room)) this.status = "build";
        }
    }

    static defaultBody: BodyPartDescription = [[WORK, 1], [CARRY, 2], [MOVE, 2]];
}
