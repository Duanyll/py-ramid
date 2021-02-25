import { myRooms, registerRoomRoutine, RoomInfo } from "room/roomInfo";
import Logger from "utils";

function runPowerSpawn(room: RoomInfo) {
    let s = room.structures.powerSpawn;
    if (!s) return;

    if (!room.state.energy.usage.power) return;
    if (room.state.autoProcessPower && room.state.powerToProcess < 50) {
        room.state.powerToProcess += 100;
    }
    if (s.store.power > 0 && s.store.energy >= POWER_SPAWN_ENERGY_RATIO && room.state.powerToProcess > 0) {
        if (s.processPower() == OK) {
            room.state.powerToProcess--;
            room.storeCurrent.add(RESOURCE_POWER, -1);
            if (room.state.powerToProcess > 0) {
                room.delay("runPowerSpawn", 1);
                return;
            }
        }
    }
    if (room.state.powerToProcess) room.delay("runPowerSpawn", 10);
}
registerRoomRoutine({
    id: "runPowerSpawn",
    dependsOn: ["countStore"],
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
