import { managedRooms, RoomInfo } from "roomInfo";

export let globalCreeps: { [role: string]: Creep[] } = {}

export function loadCreeps() {
    for (const name in managedRooms) {
        managedRooms[name].creeps = [];
        managedRooms[name].creepForRole = {};
    }
    globalCreeps = {};
    for (const name in Game.creeps) {
        const creep = Game.creeps[name];
        if (creep.spawning)
            continue;
        // console.log(`Processing creep: ${name}`)
        if (creep.memory.room) {
            let room = managedRooms[creep.memory.room];
            room.creeps.push(creep);

            if (creep.memory.roleId) {
                room.creepForRole[creep.memory.roleId] = creep;
            }
        } else {
            globalCreeps[creep.memory.role] = globalCreeps[creep.memory.role] || [];
            globalCreeps[creep.memory.role].push(creep);
        }
    }
}

let CreepRoleDrivers: {
    [roleName: string]: (creep: Creep, room?: RoomInfo) => void;
} = {}

export function registerCreepRole(drivers: {
    [roleName: string]: (creep: Creep, room?: RoomInfo) => void;
}) {
    CreepRoleDrivers = _.assign(CreepRoleDrivers, drivers);
}

export function runCreep(creep: Creep, room?: RoomInfo) {
    const role = creep.memory.role;
    if (!CreepRoleDrivers[role]) {
        console.log(`Unknown creep role: ${role} for ${creep.name}`);
        return;
    }
    CreepRoleDrivers[role](creep, room);
}
