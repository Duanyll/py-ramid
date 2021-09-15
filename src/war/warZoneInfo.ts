import { HostileRegistry } from "./hostileRegistry";

export class WarZoneInfo extends HostileRegistry {
    constructor(room: Room) {
        super(room);
    }

    getHostiles(): Creep[] {
        if (this.lastUpdate < Game.time) {
            this.run(false);
        }
        return this.currentHostiles;
    }
}

let warZoneInfoStore: Record<string, WarZoneInfo> = {};

Object.defineProperty(Room.prototype, "war", {
    get: function (this: Room) {
        if (this.info) {
            return null;
        } else {
            return warZoneInfoStore[this.name] ||= new WarZoneInfo(this);
        }
    }
})
