import { RoomInfo, registerRoomRoutine } from "roomInfo";
import { PLAYER_WHITELIST } from "config";

function checkRoads(room: RoomInfo) {
    if (room.roadToRepair.length > 0) return;
    let roads = room.detail.find(FIND_STRUCTURES, {
        filter: (s) => (s.structureType == "road" || s.structureType == "container" ) && s.hitsMax - s.hits >= 200
    });
    if (roads.length == 0) {
        room.delay("checkRoads", 500);
    } else {
        roads.forEach((r) => room.roadToRepair.push(r.id));
    }
}
registerRoomRoutine("checkRoads", checkRoads)

function getTowerAttackHits(range: number) {
    if (range <= 5) return 600;
    if (range >= 20) return 150;
    return 600 - (range - 5) * 30;
}

function getTowerHealHits(range: number) {
    if (range <= 5) return 400;
    if (range >= 20) return 100;
    return 600 - (range - 5) * 20;
}

function getTowerRepairHits(range: number) {
    if (range <= 5) return 800;
    if (range >= 20) return 200;
    return 600 - (range - 5) * 40;
}

export function tickTower(room: RoomInfo) {
    let hostile = room.detail.find(FIND_HOSTILE_CREEPS).filter((creep) => !PLAYER_WHITELIST[creep.owner.username])[0];
    let towerWorked = false;
    if (hostile) {
        room.structures.towers.forEach((tower) => {
            tower.attack(hostile);
            room.refillTargets[tower.id] = tower.store.getFreeCapacity(RESOURCE_ENERGY) + 10;
        });
        towerWorked = true;
    } else if (room.roadToRepair.length > 0) {
        let road = Game.getObjectById(room.roadToRepair[0]) as StructureRoad;
        if (!road) {
            room.roadToRepair = [];
            room.delay("checkRoads", 1);
            return;
        }
        let remainHits = road.hitsMax - road.hits;
        room.structures.towers.forEach((tower) => {
            if (remainHits > 0) {
                tower.repair(road);
                remainHits -= getTowerRepairHits(tower.pos.getRangeTo(road));
                if (tower.store.getFreeCapacity(RESOURCE_ENERGY) > 200)
                    room.refillTargets[tower.id] = tower.store.getFreeCapacity(RESOURCE_ENERGY) + 10;
            }
        });
        if (remainHits <= 0) room.roadToRepair.shift();
        towerWorked = true;
        room.delay("checkRoads", 10);
    }
}