import { registerCreepRole } from "creep";
import { runBuilder } from "./builder";
import { runCarrier } from "./carrier";
import { runHarvester, runRemoteHarvester, runRemoteCarrier, runRemoteReserver, runRemoteBuilder } from "./harvester";
import { runManager } from "./manager";
import { runMiner } from "./miner";
import { runWorker, runEmergencyWorker } from "./roleWorker";
import { runUpgrader } from "./upgrader";

registerCreepRole({
    build: runBuilder,
    carry: runCarrier,
    harvest: runHarvester,
    rhHarv: runRemoteHarvester,
    rhCarry: runRemoteCarrier,
    rhReserve: runRemoteReserver,
    rhBuild: runRemoteBuilder,
    upgrade: runUpgrader,
    work: runWorker,
    emergency: runEmergencyWorker,
    manage: runManager,
    mine: runMiner
});
