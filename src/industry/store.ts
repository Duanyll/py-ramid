import { LAB_RECIPE } from "utils/constants";
import { myRooms, registerRoomRoutine, RoomInfo } from "room/roomInfo";
import { globalDelay, registerGlobalRoutine } from "utils";
import Logger from "utils";
import cfg from "config";
import { StoreRegister } from "utils/storeRegister";

function updateRoomStore(room: RoomInfo) {
    const s = room.structures;
    const c = room.creepForRole;
    _.concat<AnyStoreStructure | Creep>(
        s.labs.input, s.labs.output, s.terminal, s.storage, s.factory, s.powerSpawn, s.mineralContainer, room.detail.find(FIND_MY_CREEPS)
    ).forEach(s => {
        _.forIn(s?.store, (amount, res) => {
            room.storeCurrent.add(res as ResourceConstant, amount as number);
        });
    });
}
registerRoomRoutine({
    id: "countStore",
    init: (room) => {
        room.storeSection = globalStore;
        room.storeSection.rooms.push(room);
        room.storeCurrent = new StoreRegister(globalStore.current);

        updateRoomStore(room);
    },

    invoke: (room) => {
        room.storeCurrent.clear();
        updateRoomStore(room);
    }
});

registerGlobalRoutine("countStore", () => {
    globalStore.produceBook();
 });

/**
 * 统计一定范围内的资源储量
 */
export class SectionStore {
    /**
     * 现有储量
     */
    current: StoreRegister;
    _book: StoreRegister;
    _bookUpd: number;
    private createBook() {
        this._book = new StoreRegister();

        this.rooms.forEach(room => {
            room.storeBook.forIn((amount, res) => this._book.add(res, amount));
        })

        this.labQueue.forEach(a => a.forEach(i => {
            this._book.add(i.product, -i.amount);
            LAB_RECIPE[i.product].forEach(r => this._book.add(r, i.amount));
        }));
        _.forIn(this.labQueueBuffer, (amount, type) => {
            this._book.add(type as ResourceConstant, -amount);
        })

        if (Memory.market.enableAutoDeal) {
            _.forIn(Memory.market.autoDeal, (info, res)=> {
                this._book.add(res as ResourceConstant, info.reserveAmount);
            })
        }
    }
    /**
     * 预定的将要消耗的储量
     */
    get book() {
        if (!this._book || this._bookUpd != Game.time) {
            this._bookUpd = Game.time;
            this.createBook();
        }
        return this._book;
    }

    parent: SectionStore;
    rooms: RoomInfo[] = [];

    get labQueue() { return Memory.labQueue; }
    get labQueueBuffer() { return Memory.labQueueBuffer; }

    constructor(parent?: SectionStore) {
        this.parent = parent;
        this.current = new StoreRegister(parent?.current);
    }

    free(res: ResourceConstant) {
        return this.current.get(res) - this.book.get(res);
    }

    flushBuffer() {
        _.forIn(this.labQueueBuffer, (amount, type) => {
            this.produceCompound(type as ResourceConstant, amount, true);
            this.labQueueBuffer[type as ResourceConstant] = 0;
        })
    }

    private getCompoundTask(product: ResourceConstant, amount: number,
        fromBuffer?: boolean, queue: { product: ResourceConstant, amount: number }[] = []) {
        amount = _.ceil(amount / LAB_REACTION_AMOUNT) * LAB_REACTION_AMOUNT + 10;
        let recipe = LAB_RECIPE[product];
        if (!recipe) return queue;
        recipe.forEach(r => {
            if (!LAB_RECIPE[r]) return;
            let free = this.free(r) - amount;
            if (free < 0) this.getCompoundTask(r, -free, false, queue);
            this.book.add(r, amount);
        });
        if (!fromBuffer) {
            this.book.add(product, -amount);
        }
        queue.push({ product, amount });
        return queue;
    }

    produceCompound(product: ResourceConstant, amount: number, fromBuffer?: boolean) {
        while (amount >= cfg.LAB_REACTION_AMOUNT * 2) {
            amount -= cfg.LAB_REACTION_AMOUNT;
            Memory.labQueue.push(this.getCompoundTask(product, cfg.LAB_REACTION_AMOUNT, fromBuffer));
        }
        if (amount > 0) this.labQueue.push(this.getCompoundTask(product, amount, fromBuffer));
        this.rooms.forEach(r => r.delay("fetchLabWork", 1));
    }

    produce(type: ResourceConstant, amount: number, noBuffer: boolean) {
        if (LAB_RECIPE[type]) {
            this.labQueueBuffer[type] ||= 0;
            this.labQueueBuffer[type] += amount;
            this.book.add(type, -amount);
            if (this.labQueueBuffer[type] >= cfg.LAB_REACTION_AMOUNT || noBuffer) {
                this.produceCompound(type, this.labQueueBuffer[type], true);
                this.labQueueBuffer[type] = 0;
            }
            return true;
        } else {
            return false;
        }
    }

    produceBook() {
        this.book.forIn((amount, res) => {
            let req = -this.free(res);
            if (req > 0) this.produce(res, req, true);
        })
    }
}

const globalStore = new SectionStore();
global.store = globalStore;

Memory.labQueueBuffer ||= {};
