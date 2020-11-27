import Logger from "utils/Logger";

let globalRoutineStore: { [type in GlobalRoutine]?: () => void } = {};
export function registerGlobalRoutine(type: GlobalRoutine, func: () => void) {
    globalRoutineStore[type] = func;
}

let globalRoutine = Memory.routine ? (Memory.routine) : (Memory.routine = {});
export function tickGlobalRoutine() {
    _.forIn(globalRoutine, (next, name) => {
        if (next == Game.time) globalRoutineStore[name as GlobalRoutine]();
    })
}

export function globalDelay(type: GlobalRoutine, time: number) {
    if (!globalRoutine[type] || globalRoutine[type] <= Game.time) {
        globalRoutine[type] = Game.time + time;
    } else {
        globalRoutine[type] = _.min([Game.time + time, globalRoutine[type]]);
    }
}

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
    tasks[time] = tasks[time] || [];
    tasks[time].push({ type, param });
}

export function tickTasks() {
    const tasks = Memory.tasks;
    if (tasks[Game.time]) {
        tasks[Game.time].forEach(t => taskStore[t.type](t.param));
        delete tasks[Game.time];
    }
}
