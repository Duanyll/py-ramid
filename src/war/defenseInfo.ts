import cfg from "config";
import { addHostileInfo, CreepInfo } from "creep/creepInfo";
import { CREEP_LONG_ACTION } from "utils/constants";
import { isHostile } from "./intelligence";

export class HostileInfo extends CreepInfo {
    owner: string;

    lastSeen: number;
    lastRoom: string;
    isTowerDrainer: boolean;

    constructor(creep: Creep) {
        super(creep);
        this.owner = creep.owner.username;
        this.update(creep);
    }

    update(creep: Creep) {
        if (this.lastRoom && creep.room.name != this.lastRoom
            || this.lastSeen && Game.time - this.lastSeen <= 5) {
            this.isTowerDrainer = true;
        }
        this.lastSeen = Game.time;
        super.update(creep);
    }
}

export class RoomDefenseInfo {
    hostileRecord: Record<string, HostileInfo> = {};
    currentHostiles: Creep[] = [];
    hostilePlayers: Record<string, number> = {};
    hostileAbility: Record<CreepLongAction, number> = _.mapValues(CREEP_LONG_ACTION, () => 0);

    activeDefense: false | {
        builder?: number,
        ranged?: number,
        melee?: number,
        updateTime: number
    };

    /** 防御模式, peace 和平, passive 只用 tower, active 派出防御 creep */
    mode: "peace" | "passive" | "active" | "disabled";

    structureUnderAttack: OwnedStructure[] = [];

    run(room: Room) {
        this.currentHostiles = [];
        room.find(FIND_HOSTILE_CREEPS).forEach(creep => {
            if (isHostile(creep.owner.username)) {
                if (this.hostileRecord[creep.id]) {
                    this.hostileRecord[creep.id].update(creep);
                } else {
                    let info = this.hostileRecord[creep.id] = new HostileInfo(creep);
                    addHostileInfo(info);
                    this.addHostile(creep.id);
                }
                this.currentHostiles.push(creep);
            }
        });

        this.structureUnderAttack = [];
        for (const log of room.getEventLog()) {
            switch (log.event) {
                case EVENT_ATTACK:
                    let obj = Game.getObjectById(log.data.targetId) as any;
                    if (obj?.my && 'structureType' in obj && obj.structureType != 'rampart') {
                        this.structureUnderAttack.push(obj);
                    }
                    break;
                case EVENT_OBJECT_DESTROYED:
                    if (log.objectId in this.hostileRecord) {
                        this.removeHostile(log.objectId);
                        room.yell();
                    }
                    break;
            }
        }

        for (const id in this.hostileRecord) {
            if (this.hostileRecord[id].timeToDie < Game.time) {
                this.removeHostile(id);
            }
        }

        this.calcActiveDefense();
    }

    calcActiveDefense() {

    }

    private addHostile(id: string) {
        const info = this.hostileRecord[id];
        this.hostilePlayers[info.owner] ||= 0;
        this.hostilePlayers[info.owner]++;

        _.forIn(info.ability, (value, key: CreepLongAction) => this.hostileAbility[key] += value);

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

    private removeHostile(id: string) {
        const info = this.hostileRecord[id];
        this.hostilePlayers[info.owner]--;
        if (!this.hostilePlayers[info.owner]) delete this.hostilePlayers[info.owner];

        _.forIn(info.ability, (value, key: CreepLongAction) => this.hostileAbility[key] -= value);
        delete this.hostileRecord[id];

        if (_.isEmpty(this.hostileRecord)) {
            this.mode = "peace";
        }
    }
}
