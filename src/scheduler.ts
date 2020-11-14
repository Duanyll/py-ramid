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
