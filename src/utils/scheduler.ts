import cfg from "config";
import { ErrorMapper } from "./errorMapper";
import Logger from "./logger";

let globalRoutineStore: { [type in GlobalRoutine]?: () => void } = {};
export function registerGlobalRoutine(type: GlobalRoutine, func: () => void) {
    globalRoutineStore[type] = ErrorMapper.wrap(func, `global task ${type}`);
}

Memory.routine ||= {};
export function tickGlobalRoutine() {
    // @ts-ignore
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
global.delay = globalDelay;

let taskStore: { [type in GlobalTask]?: (param: any) => void } = {};
export function registerTask(type: GlobalTask, func: (param: any) => void) {
    taskStore[type] = func;
}

export function initTasks() {
    let tasks = {} as typeof Memory.tasks;
    if (Memory.tasks) {
        for (const time in Memory.tasks) {
            if (Number(time) >= Game.time) tasks[time] = Memory.tasks[time];
        }
    }
    Memory.tasks = tasks;
}

export function schedule(type: GlobalTask, delay: number, param: any) {
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
global.schedule = schedule;

export function tickTasks() {
    const tasks = Memory.tasks;
    if (tasks[Game.time]) {
        tasks[Game.time].forEach(t => taskStore[t.type](t.param));
        delete tasks[Game.time];
    }
}
