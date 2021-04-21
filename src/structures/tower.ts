import { RoomInfo, registerRoomRoutine } from "room/roomInfo";

function checkRoads(room: RoomInfo) {
    if (room.roadToRepair.length > 0) return;
    let roads = room.detail.find(FIND_STRUCTURES, {
        filter: (s) => (s.structureType == "road" || s.structureType == "container") && s.hitsMax - s.hits >= 200
    });
    if (roads.length == 0) {
        room.setTimeout("checkRoads");
    } else {
        roads.forEach((r) => room.roadToRepair.push(r.id));
    }
}
registerRoomRoutine({
    id: "checkRoads",
    init: checkRoads,
    invoke: checkRoads,
})

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
    let towers = _.filter(room.structures.towers, tower => tower.store.energy >= TOWER_ENERGY_COST);
    let usedTowers = [] as StructureTower[];

    const hostiles = room.defense.currentHostiles;
    if (room.defense.mode == "passive") {
        while (towers.length) {
            const tower = towers.pop();
            tower.attack(_.sample(hostiles));
            usedTowers.push(tower);
        }
    } else if (room.defense.mode == "active") {
        let hostile = _.maxBy(hostiles, creep => {
            let damage = creep.info.calcDamage(_.sumBy(towers, tower => getTowerAttackHits(tower.pos.getRangeTo(creep))))
            - _.sumBy(_.filter(room.defense.currentHostiles, h => h.pos.inRangeTo(creep.pos, 3)), h => h.info.ability.heal)
            return (damage > 0) ? damage : null;
        });
        if (hostile) {
            while (towers.length) {
                const tower = towers.pop();
                tower.attack(hostile);
                usedTowers.push(tower);
            }
        }
    }

    if (room.roadToRepair.length > 0) {
        let road = Game.getObjectById(room.roadToRepair[0]) as StructureRoad;
        if (!road) {
            room.roadToRepair = [];
            room.setTimeout("checkRoads", 1);
            return;
        }
        let remainHits = road.hitsMax - road.hits;
        while (towers.length) {
            if (remainHits < 0) break;
            const tower = towers.pop();
            tower.repair(road);
            let hits = getTowerRepairHits(tower.pos.getRangeTo(road));
            remainHits -= hits;
            usedTowers.push(tower);
        }
        if (remainHits <= 0) room.roadToRepair.shift();
        room.setTimeout("checkRoads", 10);
    }

    for (const tower of usedTowers) {
        if (tower.store.free("energy") > 200) {
            room.refillTargets[tower.id] = tower.store.free("energy") + TOWER_ENERGY_COST;
        }
    }
}

// registerTask("setTowerState", (param) => {
//     myRooms[param.room].state.disableTower = param.state;
// })

// registerCommand('disableTower', 'Temporately disable towers in a room for 1500 ticks. ', [
//     { name: "room", type: "myRoom" }
// ], (room: string) => {
//     myRooms[room].state.disableTower = true;
//     schedule("setTowerState", 1500, { room, state: false });
// })
