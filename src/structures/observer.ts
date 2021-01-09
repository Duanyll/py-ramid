import { myRooms } from "room/roomInfo";
import { globalDelay, registerGlobalRoutine } from "utils";
import Logger from "utils";

let observeQueue: {
    [room: string]: (() => void)[];
} = {};
export function tickObserver() {
    for (const room in Game.rooms) {
        if (observeQueue[room]) {
            observeQueue[room].forEach(f => f());
            delete observeQueue[room];
        }
    }

    if (_.size(observeQueue) > 0) {
        let observers = _.compact(_.map(_.values(myRooms), room => room.structures.observer));
        let obLock: { [id: string]: boolean } = {};
        for (const room in observeQueue) {
            let ob = observers.find(o => !obLock[o.id] && Game.map.getRoomLinearDistance(room, o.room.name) <= OBSERVER_RANGE)
            if (ob?.observeRoom(room) == OK) {
                Logger.silly(`Observing room ${room}.`)
                obLock[ob.id] = true;
            }
        }
        globalDelay("observer", 1);
    }
}
registerGlobalRoutine("observer", tickObserver);

export function onVisibility(room: string, callback: () => void) {
    if (Game.rooms[room])
        callback();
    else {
        observeQueue[room] ||= [];
        observeQueue[room].push(callback);
        globalDelay("observer", 1);
    }
}
