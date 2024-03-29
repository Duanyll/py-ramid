import { LAB_RECIPE } from "utils/constants";
import { myRooms, registerRoomRoutine, RoomInfo } from "room/roomInfo";
import Logger from "utils";
import { registerCommand } from "utils/console";
import cfg from "config";

function getLabReactionAmount(lab: StructureLab) {
    let power = lab.getPower(PWR_OPERATE_LAB);
    if (power) {
        return POWER_INFO[PWR_OPERATE_LAB].effect[power - 1] + LAB_REACTION_AMOUNT;
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
    if (Game.cpu.bucket < cfg.CPU_BUCKET_THRESHOLD) {
        room.setTimeout("runLabs", 100);
        return;
    }

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

                    if (info.remain <= amount) {
                        reactionDone(room);
                        return;
                    }
                }
            }
        }
        if (info.remain <= 15) {
            reactionDone(room);
            return;
        }

        let cooldown: number = REACTION_TIME[info.product as MineralCompoundConstant];
        room.setTimeout("runLabs", cooldown);
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
    if (room.structures.labs.input.length < 2 || room.structures.labs.output.length - room.state.lab.boost.length <= 0) {
        room.setTimeout("fetchLabWork");
        return false;
    }
    if (room.state.lab.remain) {
        room.setTimeout("fetchLabWork");
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
        if (room.powerAvailable[PWR_OPERATE_LAB]) room.state.lab.allowPower = true;
        room.setTimeout("runLabs", 1);
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
    if (labsForBoost.length > 0) room.setTimeout("runBoost");
}
registerRoomRoutine({
    id: "runBoost",
    dependsOn: ["countStore"],
    invoke: runLabBoost
});

registerCommand('logLabs', 'Log lab status to console', [], () => {
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
})
