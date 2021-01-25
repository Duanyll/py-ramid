import { LAB_RECIPE, produceCompound } from "industry/compounds";
import { myRooms, registerRoomRoutine, RoomInfo } from "room/roomInfo";
import { globalDelay, registerGlobalRoutine } from "utils";
import Logger from "utils";
import cfg from "config";

function countRoomStore(room: RoomInfo) {
    room._store = {};
    function processStructure(st: AnyStoreStructure | Creep) {
        if (!st) return;
        // @ts-ignore
        _.forIn(st.store, (amount: number, type: ResourceConstant) => {
            if (amount > 0) {
                room._store[type] ||= 0;
                room._store[type] += amount;
            }
        });
    }
    const s = room.structures;
    const c = room.creepForRole;
    _.concat<AnyStoreStructure | Creep>(
        s.labs.input, s.labs.output, s.terminal, s.storage, s.factory, s.powerSpawn, c["center"], c["carry1"]
    ).forEach(processStructure);
    // room.delay("countStore", 1000);
}
registerRoomRoutine("countStore", countRoomStore);

export function countGlobalStore() {
    global.store.refresh();
    global.store.fixLock();
    globalDelay("countStore");
}
registerGlobalRoutine("countStore", countGlobalStore);

export class GlobalStoreManager {
    current: Partial<Record<ResourceConstant, number>> = {};
    reserveLock: Partial<Record<ResourceConstant, number>> = {};
    materialLock: Partial<Record<ResourceConstant, number>> = {};
    productLock: Partial<Record<ResourceConstant, number>> = {};

    refresh() {
        Logger.silly("Recounting store ...");
        this.current = {};
        this.reserveLock = {};
        this.materialLock = {};
        this.productLock = {};
        _.forIn(myRooms, (room) => {
            countRoomStore(room);
            // @ts-ignore
            _.forIn(room._store, (amount: number, type: ResourceConstant) => {
                this.current[type] ||= 0;
                this.current[type] += amount;
            });

            // @ts-ignore
            _.forIn(room.resource.reserve, (amount: number, type: ResourceConstant) => {
                this.reserveLock[type] ||= 0;
                this.reserveLock[type] += amount;
            });

            if (room.state.lab.remain) {
                const recipe = LAB_RECIPE[room.state.lab.product];
                const amount = room.state.lab.remain;
                const product: ResourceConstant = room.state.lab.product;
                recipe.forEach(r => {
                    this.materialLock[r] ||= 0;
                    this.materialLock[r] += amount;
                });
                this.productLock[product] ||= 0;
                this.productLock[product] += amount;
            }
        });

        Memory.labQueue.forEach(req => {
            LAB_RECIPE[req.product].forEach(r => {
                this.materialLock[r] ||= 0;
                this.materialLock[r] += req.amount;
            });
            this.productLock[req.product] ||= 0;
            this.productLock[req.product] += req.amount;
        });

        _.forIn(Memory.labQueueBuffer, (amount, res) => {
            this.productLock[res as ResourceConstant] ||= 0;
            this.productLock[res as ResourceConstant] += amount;
        })
    }

    constructor() {
        this.refresh();
        global.delay("countStore", 5000);
    }

    logReaction(room: RoomInfo, product: ResourceConstant, amount: number) {
        room.state.lab.remain -= amount;
        room.logStore(product, amount);
        this.productLock[product] -= amount;
        LAB_RECIPE[product].forEach(c => {
            room.logStore(c, -amount, true);
            this.materialLock[product] -= amount;
        })
    }

    getFree(res: ResourceConstant) {
        return (this.current[res] || 0) + (this.productLock[res] || 0)
            - (this.reserveLock[res] || 0) - (this.materialLock[res] || 0);
    }

    fixLock() {
        _.forIn(myRooms, (room) => {
            _.forIn(room.resource.reserve, (amount, type) => {
                room.requestResource(type as ResourceConstant, 0, true);
            })
        });


        _.forIn(myRooms, (room) => {
            _.forIn(room.resource.lock, (amount, type) => {
                room.requestResource(type as ResourceConstant, 0, true);
            })
        });

        // @ts-ignore
        _.forIn(this.materialLock, (amount, type: ResourceConstant) => {
            if (this.getFree(type) < 0) {
                global.produce(type, -this.getFree(type), true);
            }
        });
    }

    flushBuffer() {
        _.forIn(Memory.labQueueBuffer, (amount, type) => {
            produceCompound(type as ResourceConstant, amount, true);
        })
        Memory.labQueueBuffer = {};
    }
}

global.resetResource = (roomName: string) => {
    let room = myRooms[roomName];
    room.resource.produce = {
        [room.structures.mineral.mineralType]: true
    };
    room.resource.reserve = {
        XUH2O: cfg.ROOM_RESERVE_T3,
        XKH2O: cfg.ROOM_RESERVE_T3,
        XKHO2: cfg.ROOM_RESERVE_T3,
        XLH2O: cfg.ROOM_RESERVE_T3,
        XLHO2: cfg.ROOM_RESERVE_T3,
        XZH2O: cfg.ROOM_RESERVE_T3,
        XZHO2: cfg.ROOM_RESERVE_T3,
        XGHO2: cfg.ROOM_RESERVE_T3,
        G: cfg.ROOM_RESERVE_T3
    };
    room.resource.import = {};
    room.resource.export = {
        [room.structures.mineral.mineralType]: 10000
    };
    room.resource.lock = {};
}

Memory.labQueueBuffer ||= {};

global.produce = (type: ResourceConstant, amount: number, noBuffer: boolean) => {
    if (LAB_RECIPE[type]) {
        Memory.labQueueBuffer[type] ||= 0;
        Memory.labQueueBuffer[type] += amount;
        global.store.productLock[type] ||= 0;
        global.store.productLock[type] += amount;
        if (Memory.labQueueBuffer[type] >= cfg.LAB_CLEAR_THRESHOLD || noBuffer) {
            produceCompound(type, Memory.labQueueBuffer[type], true);
            delete Memory.labQueueBuffer[type];
        }
        return true;
    } else {
        return false;
    }
}
