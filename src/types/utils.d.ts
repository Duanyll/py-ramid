declare module 'consts:buildTime' {
    /**
     * Constant that will be inlined by Rollup and rollup-plugin-consts.
     */
    const buildTime: string;
    export default buildTime;
}

type Constructor<T> = { new(...param: any[]): T; }
type LogLevel = "prompt" | "assert" | "error" | "report" | "info" | "debug" | "silly";
type _SingleBodyPart<T extends BodyPartConstant> = [T, number, (keyof typeof BOOSTS[T])?];
type _AnySinglePart = (
    _SingleBodyPart<WORK>
    | _SingleBodyPart<CARRY>
    | _SingleBodyPart<MOVE>
    | _SingleBodyPart<ATTACK>
    | _SingleBodyPart<RANGED_ATTACK>
    | _SingleBodyPart<TOUGH>
    | _SingleBodyPart<HEAL>
    | [CLAIM, number]);
type BodyPartDescription = _AnySinglePart[];
type RefillableStructure = StructureTower | StructureExtension | StructureSpawn;
interface PointInRoom { x: number, y: number }

interface SpawnRequest {
    memory: CreepMemory;
    body: BodyPartDescription;
    cost?: number;
    name: string;
}

type CreepLongAction = keyof typeof import("utils/constants").CREEP_LONG_ACTION;
