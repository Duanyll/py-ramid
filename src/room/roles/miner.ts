import cfg from "config";
import { RoomInfo } from "room/roomInfo";
import { creepRole, CreepRoleBase } from "../../creep/role";

@creepRole("mine")
export class RoleMiner extends CreepRoleBase {
    work(creep: Creep, room: RoomInfo) {
        let mineral = room.structures.mineral;
        let container = room.structures.mineralContainer;
        if (!container) return;
        if (!creep.pos.isEqualTo(container.pos)) {
            creep.goTo(container, 0);
        } else {
            if (creep.harvest(mineral) == OK) {
                const amount = creep.info.ability.harvest / 2;
                room.storeCurrent.add(mineral.mineralType, amount);
            }
        }
    }

    static body: Record<number, BodyPartDescription> = {
        6: [[WORK, 12], [MOVE, 6]],
        7: [[WORK, 20], [MOVE, 10]],
        8: [[WORK, 20], [MOVE, 10]],
    }

    static spawnInfo(room: RoomInfo) {
        if (room.structRcl in RoleMiner.body &&
            room.structures.mineralContainer &&
            room.state.enableMining &&
            room.structures.mineral.mineralAmount &&
            room.storeCurrent.get(room.structures.mineral.mineralType) < cfg.TERMINAL_MINERAL) {
            return {
                "mine1": RoleMiner.body[room.structRcl]
            }
        }
    }
}
