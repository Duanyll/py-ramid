export interface CreepExitInfo {
    target: string,
    exitPos?: RoomPosition,
    route: { room: string, exit: ExitConstant }[] | ERR_NO_PATH
}

export interface CreepMoveInfo {
    opts: GoToPosOpts;
    time: number;
    path: RoomPosition[];
}

export let movingCreeps: Record<string, CreepMovement>;
export let moveInfo: Record<string, CreepMoveInfo> = {};
export let exitInfo: Record<string, CreepExitInfo> = {};
export let creepPositionLock: Record<string, boolean> = {};
export function clearCreepMoveCache(name?: string) {
    if (name) {
        delete exitInfo[name];
        delete moveInfo[name];
    } else {
        exitInfo = {};
        moveInfo = {};
    }
}

export function prepareMovement() {
    movingCreeps = {}
    creepPositionLock = {};
}
