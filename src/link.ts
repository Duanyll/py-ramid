import { registerCallback, RoomInfo } from "roomInfo";

function runLinks(room: RoomInfo) {
    if (room.structRcl < 5) return;
    room.structures.sourceLink.forEach(link => {
        if (!link) return;
        if (link.cooldown) {
            room.delay("runLinks", link.cooldown);
            return;
        }
        if (link.store.energy > 200) {
            if (!room.structures.centerLink
                || (!room.state.lastLinkToController && room.structures.controllerLink.store.energy < 400)) {
                link.transferEnergy(room.structures.controllerLink);
                room.state.lastLinkToController = true;
            } else {
                link.transferEnergy(room.structures.centerLink);
                room.state.lastLinkToController = false;
            }
        }
    });
}
registerCallback("runLinks", runLinks)
