export class StoreRegister {
    protected store: Partial<Record<ResourceConstant, number>> = {};
    /** 获取当前储量 */
    get(res: ResourceConstant) {
        return this.store[res] ?? 0;
    }

    /** 设置当前储量 */
    set(res: ResourceConstant, amount: number) {
        this.store[res] ||= 0;
        if (this.parent) this.parent.add(res, -this.store[res] + amount);
        this.store[res] = amount;
    }

    /** 修改当前储量 */
    add(res: ResourceConstant, amount: number) {
        this.store[res] ||= 0;
        if (this.parent) this.parent.add(res, amount);
        this.store[res] += amount;
    }

    forIn(f: (amount: number, res: ResourceConstant) => false | void) {
        _.forIn(this.store, f as any);
    }

    /** 清除本对象的储量统计贡献 */
    clear() {
        if (!this.parent) return;
        this.forIn((amount, res) => {
            this.parent.add(res, -amount);
        });
        this.store = {};
    }

    /** 上层统计对象，本对象出来更新时自动修改上级 */
    parent?: StoreRegister;
    children: StoreRegister[] = [];

    constructor(parent?: StoreRegister) {
        this.parent = parent;
        this.parent?.children.push(this);
    }
}

declare const Store: any;
Object.defineProperties(Store.prototype, {
    free: {
        value: function (this: StoreBase<any, any>, res?: ResourceConstant) {
            return this.getFreeCapacity(res) ?? 0;
        },
        enumerable: false,
        configurable: true
    },
    tot: {
        value: function (this: StoreBase<any, any>, res?: ResourceConstant) {
            return this.getUsedCapacity(res) ?? 0;
        },
        enumerable: false,
        configurable: true
    },
    cap: {
        value: function (this: StoreBase<any, any>, res?: ResourceConstant) {
            return this.getCapacity(res) ?? 0;
        },
        enumerable: false,
        configurable: true
    },
})
