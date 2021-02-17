import { myRooms, registerRoomRoutine, RoomInfo } from "room/roomInfo";
import Logger from "utils";

function runPowerSpawn(room: RoomInfo) {
    let s = room.structures.powerSpawn;
    if (!s) return;

    if (!room.state.energy.usage.power) return;
    if (room.state.autoProcessPower && room.storeBook.get("power") < 50) {
        room.bookResource(RESOURCE_POWER, 100)
    }
    if (s.store.power > 0 && s.store.energy >= POWER_SPAWN_ENERGY_RATIO && room.storeBook.get("power") > 0) {
        if (s.processPower() == OK) {
            room.logConsume(RESOURCE_POWER, 1, true);
            if (room.storeBook.get("power") > 0) {
                room.delay("runPowerSpawn", 1);
                return;
            }
        }
    }
    if (room.storeBook.get("power")) room.delay("runPowerSpawn", 10);
}
registerRoomRoutine({
    id: "runPowerSpawn",
    dependsOn: ["countStore"],
    // TODO: powerspawn init
    init: () => { },
    invoke: runPowerSpawn,
});

global.burnPower = (roomName: string, enable: boolean) => {
    let room = myRooms[roomName];
    if (!myRooms[roomName]?.structures.powerSpawn) {
        Logger.error(`No powerSpawn in ${roomName}!`);
        return;
    }
    if (!enable) {
        room.state.energy.primary = ["builder"];
        room.state.autoProcessPower = false;
    } else {
        room.state.energy.primary = ["power", "builder"];
        room.state.autoProcessPower = true;
        room.delay("runPowerSpawn", 1);
    }
}
