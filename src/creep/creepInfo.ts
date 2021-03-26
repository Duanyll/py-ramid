import { myRooms } from "room/roomInfo";
import { registerGlobalRoutine } from "utils";
import { BODYPART_ACTIONS, CREEP_LONG_ACTION } from "utils/constants";

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

Object.defineProperty(Creep.prototype, 'group', {
    get: function (this: Creep) {
        return creepGroups[this.memory.group];
    },
    enumerable: false,
    configurable: true
})

export class CreepInfo {
    id: string;
    timeToDie: number;

    ability: Record<CreepLongAction, number>;
    toughHits = 0;
    totalHits = 0;

    /** 满载时, 前进一格需要多少 tick */
    readonly moveSpeed: {
        road: number;
        plain: number;
        swamp: number;
    }

    constructor(creep: Creep) {
        this.id = creep.id;
        this.timeToDie = Game.time + creep.ticksToLive;
        this.ability = _.mapValues(CREEP_LONG_ACTION, () => 0);
        this.totalHits = creep.hitsMax;

        let fatigueSpeed = 0;
        let fatigueCount = 0;
        for (const part of creep.body) {
            if (part.type == MOVE) {
                let base = 2;
                if (part.boost) {
                    base *= BOOSTS.move[part.boost].fatigue;
                }
                fatigueSpeed += base;
                continue;
            }
            fatigueCount++;
            if (part.type == TOUGH) {
                this.toughHits += 100;
                continue;
            }
            if (part.type == CARRY) continue;
            for (const action of BODYPART_ACTIONS[part.type]) {
                let base = action[1];
                if (part.boost && (action[0] in (BOOSTS as any)[part.type][part.boost])) {
                    base *= (BOOSTS as any)[part.type][part.boost][action[0]];
                }
                this.ability[action[0]] += base;
            }
        }

        if (fatigueCount == 0) {
            this.moveSpeed = { road: 1, plain: 1, swamp: 1 };
        } else {
            this.moveSpeed = {
                road: _.ceil(fatigueCount / fatigueSpeed),
                plain: _.ceil(fatigueCount * 2 / fatigueSpeed),
                swamp: _.ceil(fatigueCount * 10 / fatigueSpeed)
            }
        }
    }
}

let creepInfoStore: Record<string, CreepInfo> = {};

registerGlobalRoutine("clearCreepInfoStore", () => {
    creepInfoStore = _.pickBy(creepInfoStore, info => info.timeToDie >= Game.time);
})

Object.defineProperty(Creep.prototype, "info", {
    get: function (this: Creep) {
        if (!(this.id in creepInfoStore)) creepInfoStore[this.id] = new CreepInfo(this);
        return creepInfoStore[this.id];
    },
    enumerable: false,
    configurable: true
})
