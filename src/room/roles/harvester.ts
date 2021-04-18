import { RoomInfo } from "room/roomInfo";
import { creepRole, CreepRoleBase, memorize } from "../../creep/role";
import { RoleCarrier } from "./carrier";

@creepRole("harvest")
export class RoleHarvester extends CreepRoleBase {
    @memorize
    status: "harvest" | "move"
    run(creep: Creep, room: RoomInfo) {
        const sourceId = Number(_.last(creep.memory.roleId)) - 1;
        const source = room.structures.sources[sourceId];
        const link = room.structures.sourceLink[sourceId];
        const useLink = link
            && !(room.structRcl < 5 || (room.structRcl <= 6 && sourceId == 1)) // 6 级房没有 centerLink, 不能传送, 必须直接送达
            && !_.isEmpty(room.creepForRole["carry1"]);

        if (useLink) {
            if (creep.store.free() > 20 && creep.goTo(source)) {
                creep.harvest(source);
            }
            if (creep.store.free() <= 20) {
                if (creep.goTo(link)) {
                    creep.transfer(link, "energy");
                    room.delay("runLinks", 1);
                }
            }
        } else {
            this.status = this.status || "harvest";
            if (this.status == "move" && creep.store.energy == 0) {
                this.status = "harvest";
            }
            if (this.status == "harvest" && creep.store.free() < creep.getActiveBodyparts(WORK) * 2) {
                this.status = "move";
            }

            if (this.status == "harvest") {
                if (creep.goTo(source)) {
                    creep.harvest(source);
                }
            } else {
                if (_.isEmpty(room.creepForRole["carry1"])) { if (RoleCarrier.prototype.goRefill.call(this, creep, room)) return; }
                let storage = room.structures.storage;
                if (storage && creep.goTo(storage)) {
                    creep.transfer(storage, "energy");
                }
            }
        }
    }

    static body: Record<number, BodyPartDescription> = {
        1: [[WORK, 1], [CARRY, 2], [MOVE, 2]],
        2: [[WORK, 2], [CARRY, 2], [MOVE, 4]],
        3: [[WORK, 3], [CARRY, 5], [MOVE, 4]],
        4: [[WORK, 6], [CARRY, 7], [MOVE, 7]],
        5: [[WORK, 6], [CARRY, 10], [MOVE, 8]],
        6: [[WORK, 6], [CARRY, 10], [MOVE, 8]],
        7: [[WORK, 10], [CARRY, 10], [MOVE, 10]],
        8: [[WORK, 10], [CARRY, 10], [MOVE, 10]]
    }

    static bodyLinked: Record<number, BodyPartDescription> = {
        5: [[WORK, 8], [CARRY, 4], [MOVE, 6]],
        6: [[WORK, 8], [CARRY, 4], [MOVE, 6]],
        7: [[WORK, 12], [CARRY, 4], [MOVE, 8]],
        8: [[WORK, 12], [CARRY, 4], [MOVE, 8]]
    }

    static spawnInfo(room: RoomInfo) {
        if (room.structRcl < 4) return;
        let ret = {} as Record<string, BodyPartDescription>;
        for (let i = 0; i < room.structures.sources.length; i++) {
            if (room.structures.sourceLink[i] && room.structRcl >= 5) {
                ret[`harv${i + 1}`] = this.bodyLinked[room.structRcl];
            } else {
                ret[`harv${i + 1}`] = this.body[room.structRcl];
            }
        }
        return ret;
    }
}
