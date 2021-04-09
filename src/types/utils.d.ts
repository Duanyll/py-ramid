declare module 'consts:buildTime' {
    /**
     * Constant that will be inlined by Rollup and rollup-plugin-consts.
     */
    const buildTime: string;
    export default buildTime;
}

type Constructor<T> = { new(...param: any[]): T; }
type LogLevel = "prompt" | "assert" | "error" | "report" | "info" | "debug" | "silly";
type BodyPartDescription = [BodyPartConstant, number, MineralBoostConstant?][];
type RefillableStructure = StructureTower | StructureExtension | StructureSpawn;
interface PointInRoom { x: number, y: number }

interface SpawnRequest {
    memory: CreepMemory;
    body: BodyPartDescription;
    cost?: number;
    name: string;
}

type CreepLongAction = keyof typeof import("utils/constants").CREEP_LONG_ACTION;
