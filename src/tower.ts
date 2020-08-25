import { RoomInfo } from "roomInfo";

function checkRoads(room: RoomInfo) {
    if (room.state.roadToRepair.length > 0) return;
    let roads = room.detail.find(FIND_STRUCTURES, {
        filter: (s) => s.structureType == "road" && s.hitsMax - s.hits >= 200
    });
    if (roads.length == 0) {
        room.delay("checkRoads", 900);
    } else {
        roads.forEach((r) => room.state.roadToRepair.push(r.id));
    }
}

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
    let hostile = room.detail.find(FIND_HOSTILE_CREEPS)[0];
    let towerWorked = false;
    if (hostile) {
        room.structures.towers.forEach((tower) => tower.attack(hostile));
        towerWorked = true;
    } else if (room.state.roadToRepair.length > 0) {
        let road = Game.getObjectById(room.state.roadToRepair[0]) as StructureRoad;
        let remainHits = road.hitsMax - road.hits;
        room.structures.towers.forEach((tower) => {
            if (remainHits > 0) {
                tower.repair(road);
                remainHits -= getTowerRepairHits(tower.pos.getRangeTo(road));
            }
        });
        if (remainHits <= 0) room.state.roadToRepair.pop();
        towerWorked = true;
        room.delay("checkRoads", 1);
    }
    if (towerWorked) room.delay("checkRefill", 1);
}
