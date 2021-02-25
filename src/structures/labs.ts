import { LAB_RECIPE } from "utils/constants";
import { myRooms, registerRoomRoutine, RoomInfo } from "room/roomInfo";
import Logger from "utils";

function getLabReactionAmount(lab: StructureLab) {
    let power = _.find(lab.effects, { effect: PWR_OPERATE_LAB }) as PowerEffect;
    if (power) {
        return POWER_INFO[PWR_OPERATE_LAB].effect[power.level - 1] + LAB_REACTION_AMOUNT;
    } else {
        return LAB_REACTION_AMOUNT;
    }
}

function runLabs(room: RoomInfo) {
    if (room.structRcl < 6) return;
    const info = room.state.lab;
    const labs = room.structures.labs;
    const outputLabs = _.drop(labs.output, info.boost.length);
    const recipe = LAB_RECIPE[info.product];
    if (info.remain) {
        const input0 = labs.input[0];
        const input1 = labs.input[1];
        let inputAmount = _.min([input0?.store[recipe[0]], input1?.store[recipe[1]]]);
        room.labRunning = (inputAmount >= LAB_REACTION_AMOUNT);
        for (let i = 0; i < outputLabs.length; i++) {
            let lab = outputLabs[i];
            let amount = getLabReactionAmount(lab);
            if (info.allowPower) room.requestPower(lab, PWR_OPERATE_LAB);
            if (inputAmount >= amount) {
                if (lab.runReaction(input0, input1) == OK) {
                    inputAmount -= amount;
                    info.remain -= amount;
                    room.storeCurrent.add(recipe[0], -amount);
                    room.storeCurrent.add(recipe[1], -amount);
                    room.storeCurrent.add(info.product, amount);

                    if ((info.allowPower && info.remain <= 10) || info.remain <= 0) {
                        reactionDone(room);
                        return;
                    }
                } else if (info.remain <= amount) {
                    reactionDone(room);
                    return;
                }
            }
        }
        // @ts-ignore
        let cooldown: number = REACTION_TIME[info.product];
        room.delay("runLabs", cooldown);
    }
}

registerRoomRoutine({
    id: "runLabs",
    dependsOn: ["countStore"],
    invoke: runLabs
});

function reactionDone(room: RoomInfo) {
    let info = room.state.lab;
    Logger.info(`${room.name} reaction done. `);
    info.remain = 0;
    fetchLabWork(room);
}

function fetchLabWork(room: RoomInfo) {
    if (room.structRcl < 7 || room.state.lab.boost.length >= 7) {
        room.delay("fetchLabWork");
        return false;
    }
    if (room.state.lab.remain) {
        room.delay("fetchLabWork");
        return false;
    }
    const info = room.state.lab;
    let next = info.queue?.shift();
    if (!next) {
        info.queue = Memory.labQueue.shift() || [];
        if (info.queue.length)
            Logger.info(`Room ${room.name} takes lab task group: ${_.last(info.queue).amount} * ${_.last(info.queue).product}`);
        next = info.queue.shift();
    }
    if (next) {
        info.product = next.product;
        info.remain = next.amount;
        info.total = next.amount;
        Logger.info(`Room ${room.name} takes lab task: ${info.total} * ${info.product}`);
        if (room.powerAvaliable[PWR_OPERATE_LAB]) room.state.lab.allowPower = true;
        room.delay("runLabs", 1);
        return true;
    } else {
        return false;
    }
}
registerRoomRoutine({
    id: "fetchLabWork",
    dependsOn: ["countStore"],
    invoke: fetchLabWork
});

function runLabBoost(room: RoomInfo) {
    if (room.structRcl < 6) return;
    const info = room.state.lab;
    const labs = room.structures.labs;
    const labsForBoost = _.take(labs.output, info.boost.length);
    if ('boostExpires' in info && info.boostExpires < Game.time) {
        info.boost = [];
        delete info.boostExpires;
    }
    if (labsForBoost.length > 0) room.delay("runBoost");
}
registerRoomRoutine({
    id: "runBoost",
    dependsOn: ["countStore"],
    invoke: runLabBoost
});

global.logLabs = () => {
    for (const name in myRooms) {
        let room = myRooms[name];
        let res = name + ": ";
        if (room.state.lab.remain) {
            res += `${room.state.lab.total} * ${room.state.lab.product} (${room.state.lab.remain} in progress)`
        }
        if (!room.labRunning) {
            res += "(paused)"
        }
        if (room.state.lab.boost.length) {
            res += `boost: [${room.state.lab.boost.join(',')}]`;
        }
        Logger.report(res);
    }
}
