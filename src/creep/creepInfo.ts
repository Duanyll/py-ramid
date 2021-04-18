import { registerGlobalRoutine } from "utils";
import { BODYPART_ACTIONS, CREEP_LONG_ACTION } from "utils/constants";

export let globalCreeps: { [role in CreepRoleType]?: Creep[] } = {}
export let creepGroups: {
    [groupName: string]: {
        [groupRole: string]: Creep;
    }
} = {};

export function loadCreeps() {
    for (const name in global.myRooms) {
        global.myRooms[name].creeps = [];
        global.myRooms[name].creepForRole = {};
    }
    globalCreeps = {};
    creepGroups = {};
    for (const name in Game.creeps) {
        const creep = Game.creeps[name];
        if (creep.memory.room) {
            let room = global.myRooms[creep.memory.room];
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

    readonly ability: Record<CreepLongAction, number>;
    body: BodyPartDefinition[];
    readonly hasBoost;
    readonly toughHits: number;
    readonly totalHits: number;

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
        this.body = creep.body;
        this.totalHits = creep.hitsMax;
        this.toughHits = 0;
        this.hasBoost = false;

        let fatigueSpeed = 0;
        let fatigueCount = 0;
        for (const part of creep.body) {
            if (part.boost) {
                this.hasBoost = true;
            }
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

    update(creep: Creep) {
        this.body = creep.body;
    }

    /** 实际能造成多少伤害 */
    calcDamage(damage: number) {
        let damageReduce = 0,
            damageEffective = damage;

        if (this.hasBoost) {
            for (let i = 0; i < this.body.length; i++) {
                if (damageEffective <= 0) {
                    break;
                }
                let bodyPart = this.body[i],
                    damageRatio = 1;
                if (bodyPart.type == TOUGH && bodyPart.boost) {
                    damageRatio = BOOSTS[bodyPart.type][bodyPart.boost].damage;
                }
                let bodyPartHitsEffective = bodyPart.hits / damageRatio;
                damageReduce += Math.min(bodyPartHitsEffective, damageEffective) * (1 - damageRatio);
                damageEffective -= Math.min(bodyPartHitsEffective, damageEffective);
            }
        }

        damage -= Math.round(damageReduce);

        return damage;
    }

    /** 能否打穿最前面的 tough 组件 */
    canBreakTough(damage: number) {
        let damageEffective = damage;

        for (let i = 0; i < this.body.length; i++) {
            if (damageEffective <= 0) {
                return false;
            }
            let bodyPart = this.body[i],
                damageRatio = 1;
            if (bodyPart.type == TOUGH && bodyPart.boost) {
                damageRatio = BOOSTS[bodyPart.type][bodyPart.boost].damage;
            } else {
                return true;
            }
            let bodyPartHitsEffective = bodyPart.hits / damageRatio;
            damageEffective -= Math.min(bodyPartHitsEffective, damageEffective);
        }

        return true;
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

export function addHostileInfo(info: CreepInfo) {
    creepInfoStore[info.id] = info;
}
