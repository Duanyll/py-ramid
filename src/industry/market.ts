import { setTimeout, registerGlobalRoutine } from "utils";
import Logger from "utils";
import cfg from "config";
import { registerCommand } from "utils/console";
import { myRooms, RoomInfo } from "room/roomInfo";

Memory.market ||= {} as any;
_.defaultsDeep(Memory.market, {
    enableAutoDeal: true,
    autoDeal: {},
    autoBuy: {},
    buyOrders: [],
    orderDealTime: {}
} as typeof Memory.market);
_.forIn(Memory.market.orderDealTime, (time, id) => {
    if (!Game.market.getOrderById(id)) delete Memory.market.orderDealTime[id];
})

let orderCache: Record<string, { update: number, order: Order }> = {};
let sellOrdersList = {} as Record<ResourceConstant, string[]>;
let buyOrdersList = {} as Record<ResourceConstant, string[]>;
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
    _.forIn(Memory.market.autoDeal, (info, type: ResourceConstant) => {
        buyOrdersList[type] = [];
        info.updateTime = Game.time;
        let orders = Game.market.getAllOrders({ type: ORDER_BUY, resourceType: type });
        orders.forEach(o => {
            if (o.price >= info.basePrice && o.amount > 0) {
                buyOrdersList[type].push(o.id);
                orderCache[o.id] = {
                    order: o, update: Game.time
                }
            }
        });
        buyOrdersList[type] = _.sortBy(buyOrdersList[type], (o => -getMarketOrder(o).price));
    });
    _.forIn(Memory.market.autoBuy, (info, type: ResourceConstant) => {
        sellOrdersList[type] = [];
        info.updateTime = Game.time;
        let orders = Game.market.getAllOrders({ type: ORDER_SELL, resourceType: type });
        orders.forEach(o => {
            if (o.price <= info.maxPrice && o.amount > 0) {
                sellOrdersList[type].push(o.id);
                orderCache[o.id] = {
                    order: o, update: Game.time
                }
            }
        });
        sellOrdersList[type] = _.sortBy(sellOrdersList[type], (o => getMarketOrder(o).price));
    });
    processMyBuyOrders();
    setTimeout("fetchAutoDealOrders");
}
registerGlobalRoutine("fetchAutoDealOrders", fetchAutoDealOrders);

function getOneBuyOrder(type: ResourceConstant): Order {
    let info = Memory.market.autoDeal[type];
    if (!info) return undefined;
    info.updateTime = Game.time;
    let avalList: string[] = [];
    let res: Order;
    if (!buyOrdersList[type]) return undefined;
    buyOrdersList[type].forEach(id => {
        let order = getMarketOrder(id);
        if (!order) return;
        if (order.price >= info.basePrice && order.amount > 0) {
            avalList.push(id);
            if (!res) res = order;
        }
    });
    buyOrdersList[type] = avalList;
    return res;
}

function getOneSellOrder(type: ResourceConstant): Order {
    let info = Memory.market.autoBuy[type];
    if (!info) return undefined;
    info.updateTime = Game.time;
    let avalList: string[] = [];
    let res: Order;
    if (!sellOrdersList[type]) return undefined;
    sellOrdersList[type].forEach(id => {
        let order = getMarketOrder(id);
        if (!order) return;
        if (order.price <= info.maxPrice && order.amount > 0) {
            avalList.push(id);
            if (!res) res = order;
        }
    });
    sellOrdersList[type] = avalList;
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
        let required = -global.store.free(res);
        if (required > 0) global.store.produce(res, required, false);
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
        return true;
    } else {
        return false;
    }
}

registerCommand('autoSell', 'Create or modify a auto sell order.', [
    { name: 'res', type: 'resource' },
    { name: 'price', type: 'number', description: "Set to -1 to delete the order. " },
], (type: ResourceConstant, price: number) => {
    if (price === -1) {
        delete Memory.market.autoDeal[type];
    } else {
        Memory.market.autoDeal[type] = {
            basePrice: price,
            reserveAmount: cfg.MARKET_RESERVE,
            updateTime: 0,
        }
        setTimeout("fetchAutoDealOrders", 1);
    }
})

registerCommand('autoBuy', 'Create or modify a auto but order.', [
    { name: 'res', type: 'resource' },
    { name: 'price', type: 'number', description: "Set to -1 to delete the order. " },
], (type: ResourceConstant, price: number) => {
    if (price === -1) {
        delete Memory.market.autoBuy[type];
    } else {
        Memory.market.autoBuy[type] = {
            maxPrice: price,
            minAmount: cfg.TERMINAL_EXPORT_DEFAULT,
            updateTime: 0,
        }
        setTimeout("fetchAutoDealOrders", 1);
    }
})

export function confirmMarketOrders() {
    _.forEach(Game.market.incomingTransactions, i => {
        if (i.time < Game.time - 1) return false;
        if (i.order) {
            myRooms[i.to]?.storeCurrent.add(i.resourceType as ResourceConstant, i.amount);
            let order = Game.market.getOrderById(i.order.id);
            if (order?.roomName == i.to)
                Memory.market.orderDealTime[i.order.id] = Game.time;
        }
    })

    _.forEach(Game.market.outgoingTransactions, i => {
        if (i.time < Game.time - 1) return false;
        if (i.order) {
            myRooms[i.from]?.storeCurrent.add(i.resourceType as ResourceConstant, -i.amount);
        }
    })
}

function processMyBuyOrders() {
    const allOrders = _(Game.market.orders).filter(i => {
        if (i.remainingAmount > 0) {
            return true;
        } else {
            delete Memory.market.orderDealTime[i.id];
            Game.market.cancelOrder(i.id);
            return false;
        }
    }).groupBy(i => i.roomName).value();
    _.forEach(Memory.market.buyOrders, (info) => {
        const room = myRooms[info.room];
        if (!room.structures.terminal || !room.structures.storage) return;
        if (room.structures.storage.store[info.type] > info.maxStore) return;
        const orders = _.filter(allOrders[info.room], { resourceType: info.type });
        const orderAmount = _.sumBy(orders, i => i.remainingAmount);
        _.forEach(orders, i => {
            if ((Memory.market.orderDealTime[i.id] ?? i.created) < Game.time - cfg.MARKET_ADD_PRICE_TIME
                && i.price < info.maxPrice) {
                Memory.market.orderDealTime[i.id] = Game.time;
                Game.market.changeOrderPrice(i.id, i.price + info.addPrice);
            }
        });
        if (orderAmount <= info.buffer - info.perOrder && (info.remain ?? Infinity) > 0) {
            Game.market.createOrder({
                type: ORDER_BUY, resourceType: info.type, price: info.minPrice, totalAmount: info.perOrder, roomName: info.room
            });
            if (info.remain) {
                info.remain = Math.min(info.remain - info.perOrder, 0);
            }
        }
    }
    )
}
