export interface Callback {
    invoke(): void;
}

// 管理每个 room 的主要对象
export class roomInfo {
    eventTimer: { [time: number]: Callback[] } = {};
    name: string;

    public constructor(roomName: string) {
        this.name = roomName;
    }

    public Tick(): void {
        if (this.eventTimer[Game.time]) {
            this.eventTimer[Game.time].forEach(c => c.invoke());
            delete this.eventTimer[Game.time];
        }
    }

    public scheduleEvent(time: number, callback: Callback) {
        if (time <= Game.time) {
            console.log(`Warning: Can't schedule event in the past.`);
        }
        if (this.eventTimer[time] == undefined) {
            this.eventTimer[time] = [];
        }
        this.eventTimer[time].push(callback);
    }
}
