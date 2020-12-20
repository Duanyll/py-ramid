import { myRooms } from "roomInfo";
import { globalDelay, registerGlobalRoutine } from "scheduler";
import Logger from "utils/Logger";

Memory.market ||= {} as any;
_.defaultsDeep(Memory.market, {
    enableAutoDeal: true,
    autoDeal: {}
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
    })
    globalDelay("fetchAutoDealOrders", 1000);
}
registerGlobalRoutine("fetchAutoDealOrders", fetchAutoDealOrders);

function getOneAvaliableOrder(type: ResourceConstant): Order {
    let info = Memory.market.autoDeal[type];
    if (!info) return undefined;
    if (info.updateTime == Game.time) return getMarketOrder(info.orders.shift());
    info.updateTime = Game.time;
    let avalList: string[] = [];
    let res: Order;
    info.orders.forEach(id => {
        let order = getMarketOrder(id);
        if (!order) return;
        if (order.price >= info.basePrice && order.amount > 0) {
            avalList.push(id);
        }
    });
    info.orders = avalList;
    return res;
}

export function tryDealResource(terminal: StructureTerminal, res: ResourceConstant, myAmount: number) {
    let order = getOneAvaliableOrder(res);
    if (!order || order.amount <= 0) return false;
    let dealAmount = Math.min(myAmount, order.amount);
    let room = myRooms[terminal.room.name];
    if (Game.market.deal(order.id, dealAmount, room.name) == OK) {
        Logger.info(`Dealing order ${order.id}, ${dealAmount} * ${res} sold at price ${order.price}`);
        orderCache[order.id].order.amount -= dealAmount;
        room.logStore(res, -dealAmount);
        let required = Memory.market.autoDeal[res].reserveAmount - global.store.getFree(res);
        if (required > 0) global.produce(res, required);
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
            reserveAmount: reserve || 30000,
            updateTime: 0,
            orders: []
        }
        globalDelay("fetchAutoDealOrders", 1);
    }
}
