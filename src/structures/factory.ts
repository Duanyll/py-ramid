import cfg from "config";
import { registerRoomRoutine, RoomInfo } from "room/roomInfo";

function runFactory(room: RoomInfo) {
    const factory = room.structures.factory;
    if (!factory) return;

    const info = room.state.factory;
    if (info.remain > 0) {
        const recipe = COMMODITIES[info.product as CommodityConstant];
        if ("level" in recipe) {
            if (factory.level != recipe.level || info.level != recipe.level) return;
            if (!_.find(factory.effects, e => e.effect == PWR_OPERATE_FACTORY && e.level == recipe.level)) {
                room.requestPower(factory, PWR_OPERATE_FACTORY, recipe.level);
                return;
            }
        }

        if (factory.cooldown) {
            room.delay("runFactory", factory.cooldown);
            return;
        }

        if (factory.produce(info.product as any) == OK) {
            info.remain -= recipe.amount;
            _.forIn(recipe.components, (amount, r) => {
                const res = r as ResourceConstant;
                if (res == "energy") return;
                room.storeCurrent.add(res, -amount);
            });
            room.storeCurrent.add(info.product, recipe.amount);
            if (info.remain <= 0) {
                info.remain = 0;
                delete info.product;
            }
            room.delay("runFactory", recipe.cooldown);
        }

    } else {
        if (room.structures.storage.store.energy > cfg.ENERGY.FORCE_BATTERY) {
            info.product = "battery";
            info.remain = 10000;
            info.needUnlock = false;
            room.delay("runFactory", 1);
            return;
        }
        // if (room.structures.storage.store.energy <= 80000) {
        //     info.product = "energy";
        //     info.remain = 50000;
        //     room.delay("runFactory", 1);
        //     return;
        // }
    }
}
registerRoomRoutine({
    id: "runFactory",
    dependsOn: ["countStore"],
    invoke: runFactory,
});
