import { COMPOUND_RECIPE, produceCompound } from "compounds";
import { ROOM_RESERVE_T3 } from "config";
import { myRooms, registerRoomRoutine, RoomInfo } from "roomInfo";
import { registerGlobalRoutine } from "scheduler";
import Logger from "utils/Logger";

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
        s.labs, s.terminal, s.storage, s.factory, s.powerSpawn, c["center"], c["carry1"]
    ).forEach(processStructure);
    // room.delay("countStore", 1000);
}
registerRoomRoutine("countStore", countRoomStore);

export function countGlobalStore() {
    global.store.refresh();
    global.store.fixLock()
    global.delay("countStore", 5000);
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

            if (room.state.labMode == "reaction") {
                const recipe = room.state.labContent;
                const amount = room.state.labRemainAmount;
                // @ts-ignore
                const product: ResourceConstant = REACTIONS[recipe[0]][recipe[1]];
                recipe.forEach(r => {
                    this.materialLock[r] ||= 0;
                    this.materialLock[r] += amount;
                });
                this.productLock[product] ||= 0;
                this.productLock[product] += amount;
            }
        });

        Memory.labQueue.forEach(req => {
            // @ts-ignore
            const product: ResourceConstant = REACTIONS[req.recipe[0]][req.recipe[1]];
            req.recipe.forEach(r => {
                this.materialLock[r] ||= 0;
                this.materialLock[r] += req.amount;
            });
            this.productLock[product] ||= 0;
            this.productLock[product] += req.amount;
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

    logReaction(room: RoomInfo, product: ResourceConstant, material: ResourceConstant[], amount: number) {
        room.state.labRemainAmount -= amount;
        room.logStore(product, amount);
        this.productLock[product] -= amount;
        material.forEach(c => {
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
        XUH2O: ROOM_RESERVE_T3,
        XKH2O: ROOM_RESERVE_T3,
        XKHO2: ROOM_RESERVE_T3,
        XLH2O: ROOM_RESERVE_T3,
        XLHO2: ROOM_RESERVE_T3,
        XZH2O: ROOM_RESERVE_T3,
        XZHO2: ROOM_RESERVE_T3,
        XGHO2: ROOM_RESERVE_T3,
        G: ROOM_RESERVE_T3
    };
    room.resource.import = {};
    room.resource.export = {
        [room.structures.mineral.mineralType]: 10000
    };
    room.resource.lock = {};
}

Memory.labQueueBuffer ||= {};

global.produce = (type: ResourceConstant, amount: number, noBuffer: boolean) => {
    if (COMPOUND_RECIPE[type]) {
        Memory.labQueueBuffer[type] ||= 0;
        Memory.labQueueBuffer[type] += amount;
        global.store.productLock[type] ||= 0;
        global.store.productLock[type] += amount;
        if (Memory.labQueueBuffer[type] >= 8000 || noBuffer) {
            produceCompound(type, Memory.labQueueBuffer[type], true);
            delete Memory.labQueueBuffer[type];
        }
        return true;
    } else {
        return false;
    }
}
