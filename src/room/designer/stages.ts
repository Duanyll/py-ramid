import { createMatrix } from "utils";
import { StructureMapping } from "./classic";

function createLabInfo(pos: PointInRoom[]): RoomDesign["lab"] {
    let res: RoomDesign["lab"] = { input: [], output: [] };
    pos.forEach(a => {
        if (res.input.length >= 2)
            res.output.push(a);
        else {
            let canBeIn = true;
            pos.forEach(b => {
                if (a.x < b.x - 2 || a.x > b.x + 2 || a.y < b.y - 2 || a.y > b.y + 2) canBeIn = false;
            });
            (canBeIn ? res.input : res.output).push(a);
        }
    });
    return res;
}

export function createBuildStages(matrix: string[][], room: Room, design: RoomDesign, detail: RoomDesignDetail, routes: PointInRoom[][]) {
    let ins = createMatrix(51, 51, false);
    let structPos: { [type in BuildableStructureConstant]?: PointInRoom[] } = {};
    let nroutes: { type: STRUCTURE_ROAD, x: number, y: number }[][] = [];
    for (let i = 0; i < routes.length; i++) {
        nroutes[i] = [];
        routes[i].forEach(p => {
            if (!ins[p.x][p.y]) {
                ins[p.x][p.y] = true;
                nroutes[i].push({ type: STRUCTURE_ROAD, x: p.x, y: p.y });
            }
        })
    }
    ins[design.centerSpawn.x][design.centerSpawn.y] = true;
    for (let i = 0; i < 50; i++) {
        for (let j = 0; j < 50; j++) {
            if (ins[i][j] || matrix[i][j] == ' ' || matrix[i][j] == '.' || matrix[i][j] == '~') continue;
            structPos[StructureMapping[matrix[i][j]]] ||= [];
            structPos[StructureMapping[matrix[i][j]]].push({x: i, y: j});
        }
    }
    structPos = _.mapValues(structPos, a => _.sortBy(a, i => Math.abs(i.x - design.center.x) + Math.abs(i.y - design.center.y)));
    design.lab = createLabInfo(structPos.lab);
    function take(type: BuildableStructureConstant, count: number) {
        let takeRes: { type: BuildableStructureConstant, x: number, y: number, name?: string }[] = [];
        while (count > 0) {
            count--;
            if (!structPos[type]) return takeRes;
            const cur = structPos[type].pop();
            if (!cur) { console.log(`Internal design error: need too many ${type}`); continue; }
            takeRes.push({ type: type, x: cur.x, y: cur.y });
            if (type == "spawn") _.last(takeRes).name = `${room.name}-Spawn${3 - structPos["spawn"].length}`;
        }
        return takeRes;
    }

    design.currentStage = 0;
    detail.stages = [];
    detail.stages.push({
        rcl: 1, list: [
            { x: design.centerSpawn.x, y: design.centerSpawn.y, type: "spawn", name: `${room.name}-Spawn1` }]
    });
    detail.stages.push({ rcl: 2, list: take("extension", 5) });
    detail.stages.push({ rcl: 3, list: take("extension", 5).concat(take("tower", 1)) });
    detail.stages.push({ rcl: 4, list: take("extension", 10).concat(take("storage", 1)) });
    nroutes.forEach((r) => detail.stages.push({ rcl: 4, list: r }));
    detail.stages.push({
        rcl: 5, list: take("extension", 10).concat([
            { type: "link", x: design.link.source[0].x, y: design.link.source[0].y },
            { type: "link", x: design.link.controller.x, y: design.link.controller.y }
        ], take("tower", 1))
    });
    detail.stages.push({ rcl: 5, list: take("road", structPos["road"].length) });
    detail.stages.push({
        rcl: 6, list: take("extension", 10).concat(take("terminal", 1), take("lab", 3), [{
        type:"container", x: design.mineralContainer.x, y: design.mineralContainer.y
    }]) });
    if (design.link.source[1])
        _.last(detail.stages).list.push(
            { type: "link", x: design.link.source[1].x, y: design.link.source[1].y });
    let mineral = room.find(FIND_MINERALS)[0].pos;
    _.last(detail.stages).list.push({ type: "extractor", x: mineral.x, y: mineral.y });
    detail.stages.push({
        rcl: 7, list: take("extension", 10).concat(take("tower", 1), take("spawn", 1), [
            { type: "link", x: design.link.center.x, y: design.link.center.y }
        ], take("lab", 3), take("factory", 1))
    });
    detail.stages.push({ rcl: 8, list: take("extension", 10).concat(take("tower", 3), take("observer", 1), take("spawn", 1)) });
    detail.stages.push({ rcl: 8, list: take("nuker", 1).concat(take("lab", 4), take("powerSpawn", 1)) });
}
