import Logger, { createMatrix, Queue } from "utils";
import { dx, dy, INF } from "./constants";

export function fillSquare(s: string[], t: string[][], sx: number, sy: number, size: number): void {
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            if (s[i][j] == ' ') continue;
            t[sx + i][sy + j] = s[i][j];
        }
    }
}

export function fillOutPoints(matrix: string[][], room: Room, design: RoomDesign) {
    function setFar(x: number, y: number, type: string): PointInRoom {
        let spaceCount = 0;
        for (let i = 0; i < 8; i++) {
            let creepx = x + dx[i];
            let creepy = y + dy[i];
            if (creepx < 0 || creepx >= 50 || creepy < 0 || creepy >= 50) continue;
            if (matrix[creepx][creepy] != ' ' && matrix[creepx][creepy] != '~') continue;
            spaceCount++;
            for (let j = 0; j < 8; j++) {
                let lx = creepx + dx[j];
                let ly = creepy + dy[j];
                if (lx < 0 || lx >= 50 || ly < 0 || ly >= 50) continue;
                if (matrix[lx][ly] != ' ' && matrix[lx][ly] != '~') continue;
                if (Math.abs(lx - x) == 1 && Math.abs(ly - y) == 1) continue;
                matrix[lx][ly] = type;
                return { x: lx, y: ly };
            }
        }
        if (spaceCount >= 2) {
            for (let i = 0; i < 8; i++) {
                let creepx = x + dx[i];
                let creepy = y + dy[i];
                if (creepx < 0 || creepx >= 50 || creepy < 0 || creepy >= 50) continue;
                if (matrix[creepx][creepy] != ' ' && matrix[creepx][creepy] != '~') continue;
                matrix[creepx][creepy] = type;
                return { x: creepx, y: creepy };
            }
        }

        Logger.error(`Designer: Cannot set a '${type} near (${x}, ${y}).'`)
        return undefined;
    }

    function setClose(pos: PointInRoom): PointInRoom {
        for (let i = 0; i < 8; i++) {
            let creepx = pos.x + dx[i];
            let creepy = pos.y + dy[i];
            if (creepx < 0 || creepx >= 50 || creepy < 0 || creepy >= 50) continue;
            if (matrix[creepx][creepy] != ' ' && matrix[creepx][creepy] != '~') continue;
            return { x: creepx, y: creepy };
        }
        return undefined;
    }

    design.link.controller = setFar(room.controller.pos.x, room.controller.pos.y, 'L');
    setFar(room.controller.pos.x, room.controller.pos.y, 'o');
    const sources = room.find(FIND_SOURCES);
    design.link.source = _.map(sources, s => setFar(s.pos.x, s.pos.y, 'L'));
    design.mineralContainer = setClose(room.find(FIND_MINERALS)[0].pos);
}

export function fillExtensions(matrix: string[][], center: PointInRoom) {
    let dis = createMatrix(51, 51, INF);
    let ins = createMatrix(51, 51, false);
    let q = new Queue<PointInRoom>();
    const x = center.x;
    const y = center.y;
    let count = 0;
    q.push({ x, y });
    dis[x][y] = 0;
    ins[x][y] = true;
    while (!q.empty()) {
        let u = q.pop();
        ins[u.x][u.y] = false;
        for (let i = 0; i < 8; i++) {
            let v = { x: u.x + dx[i], y: u.y + dy[i] };
            if (v.x < 3 || v.x >= 47 || v.y < 3 || v.y >= 47) continue;
            if (matrix[v.x][v.y] == ' ' || matrix[v.x][v.y] == '~') {
                matrix[v.x][v.y] = ((v.x + v.y) % 4 == 0 || Math.abs(v.x - v.y) % 4 == 0) ? 'r' : 'e';
                if (matrix[v.x][v.y] == 'e') {
                    count++;
                    if (count >= 60) return;
                }
            }
            if (matrix[v.x][v.y] != 'r') continue;
            if (dis[u.x][u.y] + 1 < dis[v.x][v.y]) {
                dis[v.x][v.y] = dis[u.x][u.y] + 1;
                if (!ins[v.x][v.y]) {
                    ins[v.x][v.y] = true;
                    q.push(v);
                }
            }
        }
    }
}
