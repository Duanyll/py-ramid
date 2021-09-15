import cfg from "config";
import { CreepInfo, addHostileInfo } from "creep/creepInfo";
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

export class HostileRegistry {
    roomName: string;
    constructor(room: Room) {
        this.roomName = room.name;
    }
    lastUpdate: number = 0;

    hostileRecord: Record<string, HostileInfo> = {};
    currentHostiles: Creep[] = [];
    hostilePlayers: Record<string, number> = {};
    hostileAbility: Record<CreepLongAction, number> = _.mapValues(CREEP_LONG_ACTION, () => 0);

    run(ignoreCivilians = false) {
        let room = Game.rooms[this.roomName];
        if (!room) return;
        this.lastUpdate = Game.time;
        this.currentHostiles = [];
        room.find(FIND_HOSTILE_CREEPS).forEach(creep => {
            if (isHostile(creep.owner.username)) {
                if (this.hostileRecord[creep.id]) {
                    this.hostileRecord[creep.id].update(creep);
                } else {
                    let info = this.hostileRecord[creep.id] = new HostileInfo(creep);
                    addHostileInfo(info);
                    if (ignoreCivilians && info.ability.attack + info.ability.rangedAttack <= 0) return;
                    this.addHostile(creep.id);
                }
                this.currentHostiles.push(creep);
            }
        });

        for (const log of room.getEventLog()) {
            switch (log.event) {
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
    }

    protected addHostile(id: string) {
        const info = this.hostileRecord[id];
        this.hostilePlayers[info.owner] ||= 0;
        this.hostilePlayers[info.owner]++;

        _.forIn(info.ability, (value, key: CreepLongAction) => this.hostileAbility[key] += value);
    }

    protected removeHostile(id: string) {
        const info = this.hostileRecord[id];
        this.hostilePlayers[info.owner]--;
        if (!this.hostilePlayers[info.owner]) delete this.hostilePlayers[info.owner];

        _.forIn(info.ability, (value, key: CreepLongAction) => this.hostileAbility[key] -= value);
        delete this.hostileRecord[id];
    }
}
