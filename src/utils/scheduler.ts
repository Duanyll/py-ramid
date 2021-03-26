import cfg from "config";
import { ErrorMapper } from "./errorMapper";
import Logger, { registerCommand } from "./console";

let globalRoutineStore: { [type in GlobalRoutine]?: () => void } = {};
export function registerGlobalRoutine(type: GlobalRoutine, func: () => void) {
    globalRoutineStore[type] = ErrorMapper.wrap(func, `global task ${type}`);
}

Memory.routine ||= {};
export function tickGlobalRoutine() {
    _.forIn(Memory.routine, (next, name: GlobalRoutine) => {
        let routine = globalRoutineStore[name];
        if (!routine) {
            Logger.error(`Unknown global routine: ${name}`);
            delete Memory.routine[name];
        }
        let defaultDelay = cfg.GLOBAL_ROUTINE_DELAY[name];
        if (next == Game.time || (defaultDelay && Game.time - next > defaultDelay)) {
            routine();
            Memory.routine[name] = _.max([Memory.routine[name], Game.time])
        }
    })
}

export function globalDelay(type: GlobalRoutine, time?: number) {
    time ??= cfg.GLOBAL_ROUTINE_DELAY[type];
    if (!Memory.routine[type] || Memory.routine[type] <= Game.time) {
        Memory.routine[type] = Game.time + time;
    } else {
        Memory.routine[type] = _.min([Game.time + time, Memory.routine[type]]);
    }
}
registerCommand('delay', 'Set a global routine. ', [
    { name: "name", type: "string" },
    { name: "time", type: "number" },
], (name: string, time: number) => {
    if (name in globalRoutineStore) {
        globalDelay(name as GlobalRoutine, time);
    } else {
        Logger.error('Unknown routine!');
    }
})

registerCommand('logGlobalRoutine', 'log global routine info to console.', [
], () => {
    _.forIn(Memory.routine, (time, name) => {
        Logger.report(`${name}: ${time} (${time > Game.time ? `${time - Game.time} ticks later` : `${Game.time - time} ticks before`})`)
    })
})


let taskStore: { [type in GlobalTask]?: (param: any) => void } = {};
export function registerTask<TTask extends GlobalTask>(type: TTask, func: (param: GlobalTaskParam[TTask]) => void) {
    taskStore[type] = func;
}

export function initTasks() {
    Memory.tasks = _.pickBy(Memory.tasks, (info, time) => Number(time) >= Game.time);
}

export function schedule<TTask extends GlobalTask>(type: TTask, delay: number, param: GlobalTaskParam[TTask]) {
    const tasks = Memory.tasks;
    if (!taskStore[type]) {
        Logger.error(`Unknown task ${type}`);
        return;
    }
    if (delay < 0) {
        Logger.error(`Invalid delay scheduling ${type} with ${JSON.stringify(param)}`);
        return;
    }
    const time = Game.time + delay;
    tasks[time] ||= [];
    tasks[time].push({ type, param });
}
registerCommand('schedule', 'Schedule a task at specific time. ', [
    { name: "name", type: "string" },
    { name: "time", type: "number" },
    { name: "param", type: "any" }
], schedule)

export function tickTasks() {
    const tasks = Memory.tasks;
    if (tasks[Game.time]) {
        tasks[Game.time].forEach(t => taskStore[t.type](t.param));
        delete tasks[Game.time];
    }
}
