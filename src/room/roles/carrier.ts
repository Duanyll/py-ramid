import { RoomInfo } from "room/roomInfo";
import { LAB_RECIPE } from "utils/constants";
import { creepRole, CreepRoleBase, memorize } from "../../creep/role";

@creepRole("carry")
export class RoleCarrier extends CreepRoleBase {
    /**
     * - pick: 取货
     * - fill: 放下
     * - refill: 填 extension
     * - pickToFill: 从 storage 或 terminal 取货，target 是要放入的对象，需要有 amount 参数
     * - idle: 闲置
     */
    @memorize
    state: "pick" | "fill" | "refill" | "pickToFill" | "idle" | "return";
    /** pick 时可选, fill 可选, pickToFill 必选 */
    @memorize
    type?: ResourceConstant;
    @memorize
    amount?: number;
    @memorize
    target: string;

    goRefill(creep: Creep, room: RoomInfo) {
        let nextTarget: RefillableStructure;

        if (this.target && room.refillTargets[this.target]) {
            const s = Game.getObjectById(this.target) as RefillableStructure;
            if (creep.goTo(s)) {
                const amount = Math.min(creep.store.energy, s.store.free("energy"));
                creep.transfer(s, "energy", amount);
                if (amount >= s.store.free("energy")) {
                    delete room.refillTargets[s.id];
                } else {
                    room.refillTargets[s.id] = s.store.free("energy") - amount;
                }
                if (amount >= creep.store.energy) {
                    this.target = null;
                    return true;
                }
            } else {
                return true;
            }
        }
        let dis = Infinity;
        for (const id in room.refillTargets) {
            if (room.refillTargets[id] == 0) {
                delete room.refillTargets[id];
                continue;
            }
            const s = (Game.getObjectById(id) as RefillableStructure);
            const cur = s.pos.getRangeTo(creep);
            if (cur < dis) {
                dis = cur;
                nextTarget = s;
            }
        }
        if (nextTarget) {
            this.target = nextTarget.id;
            creep.goTo(nextTarget);
            return true;
        } else {
            this.target = null;
            return false;
        }
    }

    protected runRefiller(creep: Creep, room: RoomInfo) {
        if (creep.store.energy == 0) {
            let target = room.tombstones.filter(t => t.store.energy > 100 && t.creep.my)[0]
                || room.detail.find(FIND_RUINS).filter(r => r.store.energy > 0)[0]
                || room.structures.storage;
            if (creep.pos.isNearTo(target)) {
                creep.withdraw(target, RESOURCE_ENERGY);
            } else {
                creep.goTo(target);
            }
            return true;
        } else {
            return this.goRefill(creep, room);
        }
    }

    getPickTask(room: RoomInfo): { id: string, type?: ResourceConstant } {
        for (const t of room.tombstones) {
            if (t.creep.my && t.store.tot() - t.store.energy > 0) {
                return { id: t.id };
            }
        }

        const labInfo = room.state.lab;
        for (let i = 0; i < room.structures.labs.input.length; i++) {
            const lab = room.structures.labs.input[i];
            if (labInfo.remain <= 0) {
                if (lab.mineralType)
                    return { id: lab.id, type: lab.mineralType };
            } else {
                let recipe = LAB_RECIPE[labInfo.product][i];
                if (lab.mineralType && lab.mineralType != recipe) {
                    return { id: lab.id, type: lab.mineralType };
                }
            }
        }

        for (let i = 0; i < room.structures.labs.output.length; i++) {
            const lab = room.structures.labs.output[i];
            if (i < labInfo.boost.length) {
                let res = labInfo.boost[i].type;
                if (lab.mineralType && lab.mineralType != res) {
                    return { id: lab.id, type: lab.mineralType };
                }
            } else {
                if (labInfo.remain <= 0) {
                    if (lab.mineralType)
                        return { id: lab.id, type: lab.mineralType };
                } else {
                    if (lab.mineralType && lab.mineralType != labInfo.product) {
                        return { id: lab.id, type: lab.mineralType };
                    } else if (lab.store[lab.mineralType] >= 800) {
                        return { id: lab.id, type: lab.mineralType };
                    }
                }
            }
        }

        const container = room.structures.mineralContainer;
        const mineral = room.structures.mineral;
        if (container?.store.tot() > 1000 || mineral.ticksToRegeneration && container?.store.tot()) {
            return { id: room.structures.mineralContainer.id };
        }

        return null;
    }

    getFillTask(room: RoomInfo): { id: string, type: ResourceConstant, amount: number } {
        function hasRes(res: ResourceConstant) {
            return (room.structures.storage?.store[res] || 0) + (room.structures.terminal?.store[res] || 0) > 0;
        }
        const labInfo = room.state.lab;
        for (let i = 0; i < room.structures.labs.input.length; i++) {
            const lab = room.structures.labs.input[i];
            if (labInfo.remain > 0) {
                let recipe = LAB_RECIPE[labInfo.product][i];
                if (!lab.mineralType || lab.mineralType == recipe && lab.store.free(recipe) > 1000) {
                    const amount = labInfo.remain - lab.store[recipe];
                    if (amount > 0 && hasRes(recipe))
                        return { id: lab.id, type: recipe, amount };
                }
            }
        }

        for (let i = 0; i < room.structures.labs.output.length; i++) {
            const lab = room.structures.labs.output[i];
            if (i < labInfo.boost.length) {
                let res = labInfo.boost[i].type;
                if (!lab.mineralType || lab.mineralType == res && lab.store.free(res) > 1000) {
                    const amount = labInfo.boost[i].amount - lab.store[res];
                    if (amount > 0 && hasRes(res))
                        return { id: lab.id, type: res, amount };
                }
                if (lab.store.free("energy") > 1000) {
                    return { id: lab.id, type: "energy", amount: lab.store.free("energy") };
                }
            } else break;
        }

        return null;
    }

    protected nextAction(creep: Creep, room: RoomInfo) {
        // 装满了
        if (creep.store.free() <= 100) {
            this.type = null;
            this.state = "return";
            creep.say("🔙")
            return;
        }

        if (creep.ticksToLive < 20) {
            if (creep.store.tot()) {
                this.type = null;
                this.state = "return";
                creep.say("🔙")
            }
            return;
        }


        // 尝试获取新的取货任务
        const pickTask = this.getPickTask(room);
        if (pickTask) {
            this.state = "pick";
            this.target = pickTask.id;
            this.type = pickTask.type;
            creep.say("🚚")
            return;
        } else if (creep.store.tot() > 0) {
            this.type = null;
            this.state = "return";
            creep.say("🔙");
            return;
        }

        // 执行装填任务
        const pickToFillTask = this.getFillTask(room);
        if (pickToFillTask) {
            this.state = "pickToFill";
            creep.say("🧱");
            this.type = pickToFillTask.type;
            this.target = pickToFillTask.id;
            this.amount = pickToFillTask.amount;
            return;
        }


        // 填 extension
        if (creep.store.tot() == 0 && !_.isEmpty(room.refillTargets)) {
            this.type = null;
            this.state = "refill";
            this.target = null;
            creep.say("🟡")
            return;
        }
    }

    run(creep: Creep, room: RoomInfo) {
        if (!this.state || this.state == "idle") {
            this.nextAction(creep, room);
        }
        switch (this.state) {
            case "refill":
                if (!this.runRefiller(creep, room)) this.state = "return";
                break;
            case "return": {
                if (!this.type || !creep.store[this.type])
                    this.type = _.findKey(creep.store) as ResourceConstant;
                if (!this.type) {
                    this.state = "idle";
                    break;
                }
                const s = room.whereToPut(this.type);
                if (creep.goTo(s)) {
                    const amount = Math.min(creep.store[this.type], s.store.free(this.type));
                    creep.transfer(s, this.type, amount);
                    if (amount == creep.store.tot()) {
                        this.state = "idle";
                    } else if (amount == creep.store[this.type]) {
                        this.type = null;
                    }
                }
                break;
            }
            case "fill": {
                const s = Game.getObjectById(this.target) as AnyStoreStructure;
                if (!s) {
                    this.state = "idle";
                    break;
                }
                if (creep.goTo(s)) {
                    if (this.type) {
                        const amount = Math.min(creep.store[this.type], s.store.free(this.type));
                        creep.transfer(s, this.type, amount);
                        this.type = null;
                        this.state = "idle";
                    } else {
                        const type = _.findKey(creep.store) as ResourceConstant;
                        if (!type) { this.state = "idle"; break; }
                        creep.transfer(s, type);
                        if (creep.store[type] == creep.store.tot()) this.state = "idle";
                    }
                }
                break;
            }
            case "pick": {
                const s = Game.getObjectById(this.target) as AnyStoreStructure;
                if (!s || creep.store.free() == 0) {
                    this.state = "idle";
                    break;
                }
                if (creep.goTo(s)) {
                    if (this.type) {
                        const amount = Math.min(creep.store.free(this.type), s.store[this.type]);
                        creep.withdraw(s, this.type, amount);
                        this.state = "idle";
                    } else {
                        const type = _.findKey(s.store) as ResourceConstant;
                        if (!type) { this.state = "idle"; break; }
                        const amount = Math.min(creep.store.free(type), s.store[type]);
                        creep.withdraw(s, type, amount);
                        if (amount == s.store.tot()) this.state = "idle";
                    }
                }
                break;
            }
            case "pickToFill": {
                const s = room.whereToGet(this.type)
                if (!s) {
                    this.state = "idle";
                    break;
                }
                if (creep.goTo(s)) {
                    const amount = Math.min(creep.store.free(this.type), s.store[this.type], this.amount || Infinity);
                    creep.withdraw(s, this.type, amount);
                    this.state = "fill";
                    creep.say("🚚");
                }
                break;
            }
        }
    }

    static body: Record<number, BodyPartDescription> = {
        4: [[CARRY, 16], [MOVE, 8]],
        5: [[CARRY, 24], [MOVE, 12]],
        6: [[CARRY, 24], [MOVE, 12]],
        7: [[CARRY, 32], [MOVE, 16]],
        8: [[CARRY, 32], [MOVE, 16]]
    }

    static spawnInfo(room: RoomInfo) {
        if (room.structRcl >= 4) {
            return {
                "carry1": this.body[room.structRcl]
            }
        }
    }
}

