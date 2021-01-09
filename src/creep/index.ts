import { RoomInfo } from "room/roomInfo";
import Logger from "utils";
import roles from "./roles";

export function runCreep(creep: Creep, room?: RoomInfo) {
    if (creep.spawning) return;
    const role = creep.memory.role;
    if (!roles[role]) {
        Logger.error(`Unknown creep role: ${role} for ${creep.name}`);
        return;
    }
    roles[role](creep, room);
}
