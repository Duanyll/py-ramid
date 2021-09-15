import cfg from "config";
import { addHostileInfo, CreepInfo } from "creep/creepInfo";
import { CREEP_LONG_ACTION } from "utils/constants";
import { HostileInfo, HostileRegistry } from "./hostileRegistry";
import { isHostile } from "./intelligence";

export class RoomDefenseInfo extends HostileRegistry {
    constructor(room: Room) {
        super(room);
    }

    activeDefense: false | {
        builder?: number,
        ranged?: number,
        melee?: number,
        updateTime: number
    };

    /** 防御模式, peace 和平, passive 只用 tower, active 派出防御 creep */
    mode: "peace" | "passive" | "active" | "disabled";

    structureUnderAttack: OwnedStructure[] = [];

    run() {
        super.run();
        let room = Game.rooms[this.roomName];
        this.structureUnderAttack = [];
        for (const log of room.getEventLog()) {
            switch (log.event) {
                case EVENT_ATTACK:
                    let obj = Game.getObjectById(log.data.targetId) as any;
                    if (obj?.my && 'structureType' in obj && obj.structureType != 'rampart') {
                        this.structureUnderAttack.push(obj);
                    }
                    break;
            }
        }

        this.calcActiveDefense();
    }

    calcActiveDefense() {

    }

    protected addHostile(id: string) {
        super.addHostile(id);

        const info = this.hostileRecord[id];
        if (this.mode == "peace" && info.owner == cfg.NPC_USER_NAME) {
            if (this.hostileAbility.heal > cfg.DEFENSE.ACTIVE_HEAL_THRESHOLD) {
                this.mode = "active";
            } else {
                this.mode = "passive";
            }
        } else {
            if (this.hostileAbility.heal > cfg.DEFENSE.ACTIVE_HEAL_THRESHOLD) {
                this.mode = "active";
            } else {
                this.mode = "passive";
            }
        }
    }

    protected removeHostile(id: string) {
        super.removeHostile(id);

        if (_.isEmpty(this.hostileRecord)) {
            this.mode = "peace";
        }
    }
}
