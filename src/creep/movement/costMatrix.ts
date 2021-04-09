import cfg from "config";
import Logger from "utils";
import { isHostile } from "war/intelligence";

export default class CostMatrixCache {
    private static cacheStore: Record<string, CostMatrixCache> = {};
    static get(roomName: string, type: "wallOnly" | "terrain" | "structure" | "breakWall") {
        this.cacheStore[roomName] ||= new CostMatrixCache(roomName);
        this.cacheStore[roomName].tryUpdate();
        return this.cacheStore[roomName][type];
    }

    static forceUpdate(roomName: string) {
        if (!this.cacheStore[roomName]) {
            this.cacheStore[roomName] = new CostMatrixCache(roomName);
        } else {
            this.cacheStore[roomName].update();
        }
    }

    readonly roomName: string;
    updateTime: number;
    updateWithVisibility: boolean;
    constructor(roomName: string) {
        this.roomName = roomName;
        this.update();
    }

    /** 有墙的地方均不可通行, 没墙的地方都是 1 */
    wallOnly: CostMatrix;
    /** 只包含地形信息, 平地是 2, 沼泽是 10 */
    terrain: CostMatrix;

    /** 日常使用的类型, 在 terrain 的基础上, 加入不可通行的建筑, 道路权重为 1 */
    structure: CostMatrix;
    /** 破墙模式, 没有墙的地方都是 0, 有墙或不可通行建筑的地方按照墙的厚度排序 */
    breakWall: CostMatrix;
    /** 分区图, 权重值表示连通块序号 */
    // zones: CostMatrix;

    private tryUpdate() {
        if (this.updateTime + cfg.COSTMATRIX_UPDATE < Game.time
            || (Game.rooms[this.roomName] && !this.updateWithVisibility)) {
            this.update();
        }
    }

    update() {
        Logger.silly(`Update CostMatrix cache in room ${this.roomName}`);
        if (Game.rooms[this.roomName]) {
            this.updateStructure(Game.rooms[this.roomName]);
        } else {
            this.updateBlind(Game.map.getRoomTerrain(this.roomName));
        }
    }

    private updateStructure(room: Room) {
        this.updateTime = Game.time;
        this.updateBlind(room.getTerrain());
        this.updateWithVisibility = true;

        this.structure = this.terrain.clone();
        let maxHits = 0;
        let unwalkable: Structure[] = [];
        for (const s of room.find(FIND_STRUCTURES)) {
            switch (s.structureType) {
                case "road":
                    // 在墙上或者没有不可通行建筑
                    if (this.terrain.get(s.pos.x, s.pos.y) == 0xff || this.structure.get(s.pos.x, s.pos.y) != 0xff) {
                        this.structure.set(s.pos.x, s.pos.y, 1);
                    }
                    break;
                case "rampart":
                    if (isHostile(s.owner.username) || !s.my && !s.isPublic) {
                        this.structure.set(s.pos.x, s.pos.y, 0xff);
                    }
                    maxHits = Math.max(maxHits, s.hits);
                    unwalkable.push(s);
                    break;
                case "container":
                    break;
                default:
                    this.structure.set(s.pos.x, s.pos.y, 0xff);
                    maxHits = Math.max(maxHits, s.hits);
                    unwalkable.push(s);
                    break;
            }
        }

        for (const site of room.find(FIND_MY_CONSTRUCTION_SITES)) {
            switch (site.structureType) {
                case "road":
                case "rampart":
                case "container":
                    break;
                default:
                    this.structure.set(site.pos.x, site.pos.y, 0xff);
            }
        }

        this.breakWall = new PathFinder.CostMatrix();
        for (let x = 0; x < 50; x++) {
            for (let y = 0; y < 50; y++) {
                if (this.terrain.get(x, y) == 0xff) {
                    this.breakWall.set(x, y, 0xff);
                }
            }
        }
        for (const s of unwalkable) {
            this.breakWall.set(s.pos.x, s.pos.y, Math.max(0xff - 1, Math.min(1,
                this.breakWall.get(s.pos.x, s.pos.y) + _.floor(s.hits * 0xff / s.hitsMax))));
        }
    }

    private updateBlind(terrain: RoomTerrain) {
        this.updateTime = Game.time;
        this.updateWithVisibility = false;

        if (this.wallOnly && this.terrain) return;
        this.wallOnly = new PathFinder.CostMatrix();
        this.terrain = new PathFinder.CostMatrix();
        for (let x = 0; x < 50; x++) {
            for (let y = 0; y < 50; y++) {
                switch (terrain.get(x, y)) {
                    case TERRAIN_MASK_WALL:
                        this.wallOnly.set(x, y, 0xff);
                        this.terrain.set(x, y, 0xff);
                        break;
                    case 0:
                        this.wallOnly.set(x, y, 1);
                        this.terrain.set(x, y, 2);
                        break;
                    case TERRAIN_MASK_SWAMP:
                        this.wallOnly.set(x, y, 1);
                        this.terrain.set(x, y, 10);
                        break;
                }
            }
        }

        this.structure ||= this.terrain;
        this.breakWall ||= this.wallOnly;
    }
}
