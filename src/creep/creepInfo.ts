import { myRooms } from "room/roomInfo";

export let globalCreeps: { [role in CreepRole]?: Creep[] } = {}
export let creepGroups: {
    [groupName: string]: {
        [groupRole: string]: Creep;
    }
} = {};

export function loadCreeps() {
    for (const name in myRooms) {
        myRooms[name].creeps = [];
        myRooms[name].creepForRole = {};
    }
    globalCreeps = {};
    creepGroups = {};
    for (const name in Game.creeps) {
        const creep = Game.creeps[name];
        // console.log(`Processing creep: ${name}`)
        if (creep.memory.room) {
            let room = myRooms[creep.memory.room];
            room.creeps.push(creep);

            if (creep.memory.roleId) {
                room.creepForRole[creep.memory.roleId] ||= [];
                room.creepForRole[creep.memory.roleId].push(creep);
            }
        } else {
            globalCreeps[creep.memory.role] ||= [];
            globalCreeps[creep.memory.role].push(creep);

            if (creep.memory.group) {
                creepGroups[creep.memory.group] ||= {};
                creepGroups[creep.memory.group][creep.memory.roleId] = creep;
            }
        }
    }
}
