import { managedRooms } from "roomInfo";

export function setRoomDelayTask(roomName: string, task: CallbackType, delayTime: number) {
    managedRooms[roomName].delay(task, delayTime);
}

export function addRemoteSource(roomName: string, sourceId: string, sourceRoom: string) {
    Memory.rooms[roomName].remoteSources.push({ id: sourceId, room: sourceRoom });
}
