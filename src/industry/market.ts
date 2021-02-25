import { globalDelay, registerGlobalRoutine } from "utils";
import Logger from "utils";
import cfg from "config";

Memory.market ||= {} as any;
_.defaultsDeep(Memory.market, {
    enableAutoDeal: true,
    autoDeal: {},
    autoBuy: {}
} as typeof Memory.market);

let orderCache: Record<string, { update: number, order: Order }> = {};
function getMarketOrder(id: string) {
    if (!id) return undefined;
    if (orderCache[id] && orderCache[id].update == Game.time) {
        return orderCache[id].order;
    } else {
        orderCache[id] = {
            order: Game.market.getOrderById(id),
            update: Game.time
        }
        return orderCache[id].order;
    }
}

function fetchAutoDealOrders() {
    // @ts-ignore
    _.forIn(Memory.market.autoDeal, (info, type: ResourceConstant) => {
        info.orders = [];
        info.updateTime = Game.time;
        let orders = Game.market.getAllOrders({ type: ORDER_BUY, resourceType: type });
        orders.forEach(o => {
            if (o.price >= info.basePrice && o.amount > 0) {
                info.orders.push(o.id);
                orderCache[o.id] = {
                    order: o, update: Game.time
                }
            }
        });
        info.orders = _.sortBy(info.orders, (o => -getMarketOrder(o).price));
    });
    // @ts-ignore
    _.forIn(Memory.market.autoBuy, (info, type: ResourceConstant) => {
        info.orders = [];
        info.updateTime = Game.time;
        let orders = Game.market.getAllOrders({ type: ORDER_SELL, resourceType: type });
        orders.forEach(o => {
            if (o.price <= info.maxPrice && o.amount > 0) {
                info.orders.push(o.id);
                orderCache[o.id] = {
                    order: o, update: Game.time
                }
            }
        });
        info.orders = _.sortBy(info.orders, (o => getMarketOrder(o).price));
    });
    globalDelay("fetchAutoDealOrders");
}
registerGlobalRoutine("fetchAutoDealOrders", fetchAutoDealOrders);

function getOneBuyOrder(type: ResourceConstant): Order {
    let info = Memory.market.autoDeal[type];
    if (!info) return undefined;
    info.updateTime = Game.time;
    let avalList: string[] = [];
    let res: Order;
    info.orders.forEach(id => {
        let order = getMarketOrder(id);
        if (!order) return;
        if (order.price >= info.basePrice && order.amount > 0) {
            avalList.push(id);
            if (!res) res = order;
        }
    });
    info.orders = avalList;
    return res;
}

function getOneSellOrder(type: ResourceConstant): Order {
    let info = Memory.market.autoBuy[type];
    if (!info) return undefined;
    info.updateTime = Game.time;
    let avalList: string[] = [];
    let res: Order;
    info.orders.forEach(id => {
        let order = getMarketOrder(id);
        if (!order) return;
        if (order.price <= info.maxPrice && order.amount > 0) {
            avalList.push(id);
            if (!res) res = order;
        }
    });
    info.orders = avalList;
    return res;
}

// 每 tick 每种资源只尝试 deal 一次
export function tryDealResource(terminal: StructureTerminal, res: ResourceConstant, myAmount: number) {
    let order = getOneBuyOrder(res);
    if (!order || order.amount <= 0) return false;
    let dealAmount = Math.min(cfg.TERMINAL_EXPORT_DEFAULT, myAmount, order.amount);
    let room = terminal.room.info;
    if (Game.market.deal(order.id, dealAmount, room.name) == OK) {
        Logger.info(`Dealing order ${order.id}, ${dealAmount} * ${res} sold at price ${order.price}`);
        terminal.worked = true;
        orderCache[order.id].order.amount -= dealAmount;
        room.storeCurrent.add(res, -dealAmount);
        let required = -global.store.free(res);
        if (required > 0) global.produce(res, required);
        return true;
    } else {
        return false;
    }
}

export function tryBuyResource(terminal: StructureTerminal, res: ResourceConstant, myAmount: number) {
    let order = getOneSellOrder(res);
    if (!order || order.amount <= 0) return false;
    let dealAmount = Math.min(myAmount, order.amount);
    let room = terminal.room.info;
    if (Game.market.deal(order.id, dealAmount, room.name) == OK) {
        Logger.info(`Dealing order ${order.id}, ${dealAmount} * ${res} bought at price ${order.price}`);
        terminal.worked = true;
        orderCache[order.id].order.amount -= dealAmount;
        room.storeCurrent.add(res, dealAmount);
        return true;
    } else {
        return false;
    }
}

global.autoSell = (type: ResourceConstant, price: number | false, reserve?: number) => {
    if (price === false) {
        delete Memory.market.autoDeal[type];
    } else {
        Memory.market.autoDeal[type] = {
            basePrice: price,
            reserveAmount: reserve ?? cfg.MARKET_RESERVE,
            updateTime: 0,
            orders: []
        }
        globalDelay("fetchAutoDealOrders", 1);
    }
}

global.autoBuy = (type: ResourceConstant, price: number | false, minAmount?: number) => {
    if (price === false) {
        delete Memory.market.autoBuy[type];
    } else {
        Memory.market.autoBuy[type] = {
            maxPrice: price,
            minAmount: minAmount ?? cfg.TERMINAL_EXPORT_DEFAULT,
            updateTime: 0,
            orders: []
        }
        globalDelay("fetchAutoDealOrders", 1);
    }
}
