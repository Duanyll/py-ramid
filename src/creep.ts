import { myRooms, RoomInfo } from "roomInfo";

export let globalCreeps: { [role: string]: Creep[] } = {}

export function loadCreeps() {
    for (const name in myRooms) {
        myRooms[name].creeps = [];
        myRooms[name].creepForRole = {};
    }
    globalCreeps = {};
    for (const name in Game.creeps) {
        const creep = Game.creeps[name];
        // console.log(`Processing creep: ${name}`)
        if (creep.memory.room) {
            let room = myRooms[creep.memory.room];
            room.creeps.push(creep);

            if (creep.memory.roleId) {
                room.creepForRole[creep.memory.roleId] = room.creepForRole[creep.memory.roleId] || [];
                room.creepForRole[creep.memory.roleId].push(creep);
            }
        } else {
            if (creep.spawning) continue;
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
    if (creep.spawning) return;
    const role = creep.memory.role;
    if (!CreepRoleDrivers[role]) {
        console.log(`Unknown creep role: ${role} for ${creep.name}`);
        return;
    }
    CreepRoleDrivers[role](creep, room);
}
