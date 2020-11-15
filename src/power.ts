import { registerRoomRoutine, RoomInfo } from "roomInfo";

function runPowerSpawn(room: RoomInfo) {
    let s = room.structures.powerSpawn;
    if (!s) return;
    if (s.store.power > 0 && s.store.energy >= POWER_SPAWN_ENERGY_RATIO && room.state.powerToProcess > 0) {
        if (s.processPower() == OK) {
            room.state.powerToProcess--;
            if (room.state.powerToProcess > 0) room.delay("runPowerSpawn", 1);
        }
    }
}
registerRoomRoutine("runPowerSpawn", runPowerSpawn);
