import { registerRoomRoutine, RoomInfo } from "room/roomInfo";

function runLinks(room: RoomInfo) {
    if (room.structRcl < 5) return;
    const info = room.state.link;
    function targetLink(t: "center" | "controller") {
        let l = (t == "center" && info.centerMode == "recieve") ? room.structures.centerLink : room.structures.controllerLink;
        return l ?? room.structures.centerLink;
    }
    function processLink(link: StructureLink) {
        if (!link) return;
        if (link.cooldown) {
            room.delay("runLinks", link.cooldown);
            return;
        }
        if (link.store.energy > 200) {
            let target = targetLink(info.targets[0]);
            info.targets.push(info.targets.shift());
            if (target.store.energy < 600) {
                link.transferEnergy(target);
            }
        }
    }
    room.structures.sourceLink.forEach(processLink);
    if (info.centerMode == "send") processLink(room.structures.centerLink);
}
registerRoomRoutine({
    id: "runLinks",
    invoke: runLinks
})
