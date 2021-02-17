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
        room.storeBook = new StoreRegister(globalStore.book);
        room.incomingProduct = new StoreRegister(globalStore.product);

        updateRoomStore(room);

        _.forIn(room.resource.reserve, (amount, res) => {
            room.storeBook.add(res as ResourceConstant, amount);
        })
    },

    invoke: (room) => {
        room.storeCurrent.clear();
        updateRoomStore(room);
    }
});

registerGlobalRoutine("countStore", () => { });

/**
 * 统计一定范围内的资源储量
 */
export class SectionStore {
    /**
     * 现有储量
     */
    current: StoreRegister;
    /**
     * 预定的将要消耗的储量
     */
    book: StoreRegister;
    /**
     * 即将生成出来的储量
     */
    product: StoreRegister;

    parent: SectionStore;
    rooms: RoomInfo[] = [];

    get labQueue() { return Memory.labQueue; }
    get labQueueBuffer() { return Memory.labQueueBuffer; }

    constructor(parent?: SectionStore) {
        this.parent = parent;
        this.current = new StoreRegister(parent?.current);
        this.book = new StoreRegister(parent?.book);
        this.product = new StoreRegister(parent?.product);

        this.labQueue.forEach(a => a.forEach(i => {
            this.product.add(i.product, i.amount);
            LAB_RECIPE[i.product].forEach(r => this.book.add(r, i.amount));
        }));
        _.forIn(this.labQueueBuffer, (amount, type) => {
            this.product.add(type as ResourceConstant, amount);
        })
    }

    free(res: ResourceConstant) {
        return this.current.get(res) + this.product.get(res) - this.book.get(res);
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
            this.product.add(product, amount);
        }
        queue.push({ product, amount });
        return queue;
    }

    produceCompound(product: ResourceConstant, amount: number, fromBuffer?: boolean) {
        while (amount >= cfg.TERMINAL_EXPORT_AMOUNT * 2) {
            amount -= cfg.TERMINAL_EXPORT_AMOUNT;
            Memory.labQueue.push(this.getCompoundTask(product, cfg.TERMINAL_EXPORT_AMOUNT, fromBuffer));
        }
        if (amount > 0) this.labQueue.push(this.getCompoundTask(product, amount, fromBuffer));
        this.rooms.forEach(r => r.delay("fetchLabWork", 1));
    }

    produce(type: ResourceConstant, amount: number, noBuffer: boolean) {
        if (LAB_RECIPE[type]) {
            this.labQueueBuffer[type] ||= 0;
            this.labQueueBuffer[type] += amount;
            this.product.add(type, amount);
            if (this.labQueueBuffer[type] >= cfg.TERMINAL_EXPORT_AMOUNT || noBuffer) {
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
            if (req > 0) global.produce(res, req);
        })
    }
}

const globalStore = new SectionStore();
global.store = globalStore;

Memory.labQueueBuffer ||= {};

global.produce = globalStore.produce.bind(globalStore);
