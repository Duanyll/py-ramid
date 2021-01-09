import { myRooms, registerRoomRoutine, RoomInfo } from "room/roomInfo";
import Logger from "utils";

function runPowerSpawn(room: RoomInfo) {
    let s = room.structures.powerSpawn;
    if (!s) return;

    if (!room.state.energy.usage.power) return;
    if (room.state.autoProcessPower && room.resource.lock[RESOURCE_POWER] < 50) {
        room.requestResource(RESOURCE_POWER, 100)
    }
    if (s.store.power > 0 && s.store.energy >= POWER_SPAWN_ENERGY_RATIO && room.resource.lock[RESOURCE_POWER] > 0) {
        if (s.processPower() == OK) {
            room.logStore(RESOURCE_POWER, -1, true);
            if (room.resource.lock[RESOURCE_POWER] > 0) {
                room.delay("runPowerSpawn", 1);
                return;
            }
        }
    }
    if (room.resource.lock[RESOURCE_POWER]) room.delay("runPowerSpawn", 10);
}
registerRoomRoutine("runPowerSpawn", runPowerSpawn);

global.burnPower = (roomName: string, amount: number | "auto" | false) => {
    let room = myRooms[roomName];
    if (!myRooms[roomName]?.structures.powerSpawn) {
        Logger.error(`No powerSpawn in ${roomName}!`);
        return;
    }
    if (amount === false) {
        room.state.energy.primary = ["builder"];
        room.resource.lock[RESOURCE_POWER] = 0;
        room.state.autoProcessPower = false;
    } else if (amount == "auto") {
        room.state.energy.primary = ["power", "builder"];
        room.state.autoProcessPower = true;
        room.requestResource("power", 100);
        room.delay("runPowerSpawn", 1);
    } else {
        room.state.energy.primary = ["power", "builder"];
        room.state.autoProcessPower = false;
        room.requestResource("power", amount);
        room.delay("runPowerSpawn", 1);
    }
}
