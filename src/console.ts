import { managedRooms } from "loop";

export function setRoomDelayTask(roomName: string, task: CallbackType, delayTime: number) {
    managedRooms[roomName].delay(task, delayTime);
}
