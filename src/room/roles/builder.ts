import { RoomInfo } from "room/roomInfo";
import cfg from "config";
import { creepRole, CreepRoleBase, memorize } from "../../creep/role";
import { RoleUpgrader } from "./upgrader";
import { RoleCarrier } from "./carrier";

function getCloestWall(creep: Creep, walls: Map<string, number>) {
    let mindis = Infinity;
    let result = '';
    for (const id of walls.keys()) {
        const dis = creep.pos.getRangeTo(Game.getObjectById(id));
        if (dis < mindis) {
            mindis = dis;
            result = id;
        }
    }
    return result;
}

@creepRole("build")
export class RoleBuilder extends CreepRoleBase {
    @memorize
    state: "pickup" | "work";
    @memorize
    lastBuildPos?: { x: number, y: number };
    @memorize
    target: string;

    goBuild(creep: Creep, room: RoomInfo) {
        // 优先把才修好的 rampart 修一点防止损坏
        if (this.lastBuildPos) {
            let rampart = room.detail.lookForAt(LOOK_STRUCTURES, this.lastBuildPos.x, this.lastBuildPos.y)
                .find(s => s.structureType == "rampart" && s.hits < cfg.WALL_BUILD_STEP) as StructureRampart;
            if (rampart) {
                if (creep.goTo(rampart, 3)) {
                    creep.repair(rampart);
                }
                return true;
            } else {
                this.lastBuildPos = null;
            }
        }

        // 随便找一个工地, 以后可能实现建造优先级
        const target = _.first(room.detail.find(FIND_MY_CONSTRUCTION_SITES));
        if (target) {
            if (creep.goTo(target, 3)) {
                creep.build(target);
                this.lastBuildPos = { x: target.pos.x, y: target.pos.y }
            } else {
                this.lastBuildPos = null;

            }
            return true;
        }

        this.lastBuildPos = null;
        if (room.wallBuildRequest.size > 0) {
            if (!this.target || !room.wallBuildRequest.has(this.target)) {
                this.target = getCloestWall(creep, room.wallBuildRequest);
            }

            let st = Game.getObjectById(this.target) as (StructureRampart | StructureWall);
            if (!st) {
                room.setTimeout("fetchWall", 1);
                return;
            }
            let remHits = room.wallBuildRequest.get(this.target);
            if (creep.goTo(st, 3)) {
                if (creep.repair(st) == OK) {
                    remHits -= creep.info.ability.repair;
                    if (remHits <= 0) {
                        room.wallBuildRequest.delete(this.target);
                    } else {
                        room.wallBuildRequest.set(this.target, remHits);
                    }
                }
            }
            return true;
        } else
            return false;

    }

    work(creep: Creep, room: RoomInfo) {
        this.state = this.state || "pickup";
        if (this.state == "work" && creep.store.energy == 0) {
            this.state = "pickup";
        }
        if (this.state == "pickup" && creep.store.getFreeCapacity() == 0) {
            this.state = "work";
        }

        if (this.state == "pickup") {
            if (room.state.energy.storeMode) {
                if (room.structRcl >= 7) return;
                const target = _.last(room.detail.find(FIND_SOURCES_ACTIVE));
                if (!target) return;
                if (creep.goTo(target)) {
                    creep.harvest(target);
                }
            } else {
                const target = room.structures.storage
                if (!target) return;
                if (creep.goTo(target)) {
                    creep.withdraw(target, "energy");
                }
            }
        } else {
            if (_.isEmpty(room.creepForRole["carry1"])) {
                if (RoleCarrier.prototype.goRefill.call(this, creep, room)) return;
            }
            if (room.state.energy.storeMode) {
                const target = room.structures.storage;
                if (creep.goTo(target)) {
                    creep.transfer(target, "energy");
                }
                return;
            }
            if (!this.goBuild(creep, room)) {
                if (room.state.energy.usage.builder && room.wallHits > 0) {
                    room.setTimeout("fetchWall", 1);
                } else {
                    RoleUpgrader.prototype.goUpgrade.call(this, creep, room);
                }
            }
        }
    }

    static body: Record<number, BodyPartDescription> = {
        1: [[WORK, 1], [CARRY, 2], [MOVE, 2]],
        2: [[WORK, 2], [CARRY, 2], [MOVE, 4]],
        3: [[WORK, 3], [CARRY, 5], [MOVE, 4]],
        4: [[WORK, 6], [CARRY, 7], [MOVE, 7]],
        5: [[WORK, 8], [CARRY, 8], [MOVE, 8]],
        6: [[WORK, 10], [CARRY, 10], [MOVE, 10]],
        7: [[WORK, 12], [CARRY, 12], [MOVE, 12]],
        8: [[WORK, 16], [CARRY, 16], [MOVE, 16]]
    }

    static spawnInfo(room: RoomInfo) {
        if (room.structRcl <= 3) {
            return;
        } else if (room.structRcl <= 5) {
            return {
                "build1": this.body[room.structRcl],
                "build2": this.body[room.structRcl]
            }
        } else if (room.state.boostUpgrade) {
            if (room.detail.find(FIND_CONSTRUCTION_SITES).length) {
                return {
                    "build1": this.body[room.structRcl]
                }
            } else {
                return;
            }
        } else {
            if (room.structRcl == 6) {
                return {
                    "build1": this.body[room.structRcl]
                }
            } else if (room.state.energy.usage.builder) {
                return {
                    "build1": this.body[room.structRcl]
                }
            }
        }
    }
}
