import { CreepExitInfo, CreepMoveInfo, movingCreeps, exitInfo, creepPositionLock, moveInfo } from "./data";

declare global {
    interface Creep {
        exitInfo: CreepExitInfo,
        moveInfo: CreepMoveInfo,
    }

    interface PowerCreep {
        exitInfo: CreepExitInfo,
        moveInfo: CreepMoveInfo,

        fatigue: undefined;
    }
}

const movementCacheExtensions = {
    movement: {
        get: function (this: AnyCreep) {
            return movingCreeps[this.name];
        },
        set: function (this: AnyCreep, v: CreepMovement) {
            if (!this.my) return;
            if ('room' in v && v.room == this.room.name) return;
            movingCreeps[this.name] = v;
        },
        enumerable: false,
        configurable: true
    },
    exitInfo: {
        get: function (this: AnyCreep) {
            return exitInfo[this.name];
        },
        set: function (this: AnyCreep, v: CreepExitInfo) {
            exitInfo[this.name] = v;
        },
        enumerable: false,
        configurable: true
    },
    posLock: {
        get: function (this: AnyCreep) {
            return creepPositionLock[this.name];
        },
        set: function (this: AnyCreep, v: boolean) {
            creepPositionLock[this.name] = v;
        },
        enumerable: false,
        configurable: true
    },
    moveInfo: {
        get: function (this: AnyCreep) {
            return moveInfo[this.name];
        },
        set: function (this: AnyCreep, v: CreepMoveInfo) {
            moveInfo[this.name] = v;
        },
        enumerable: false,
        configurable: true
    }
}
Object.defineProperties(Creep.prototype, movementCacheExtensions);
Object.defineProperties(PowerCreep.prototype, movementCacheExtensions);

const movementExtensions = {
    goTo: {
        value: function (this: AnyCreep, target: RoomPosition | { pos: RoomPosition }, range = 1) {
            let pos = (target instanceof RoomPosition) ? target : target.pos;
            if (this.pos.inRangeTo(pos, range)) {
                return true;
            } else {
                this.movement = _.assign(this.movement, { pos, range });
                return false;
            }
        },
        configurable: true,
        enumerable: false
    },
    goToRoom: {
        value: function (this: AnyCreep, room: string) {
            if (this.room.name == room) {
                return true;
            } else {
                this.movement = _.assign(this.movement, { room });
                return false;
            }
        },
        configurable: true,
        enumerable: false
    }
};
Object.defineProperties(Creep.prototype, movementExtensions);
Object.defineProperties(PowerCreep.prototype, movementExtensions);
