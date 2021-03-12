import { runBuilder } from "./builder";
import { runCarrier } from "./carrier";
import { runHarvester } from "./harvester";
import { runManager } from "./manager";
import { runMiner } from "./miner";
import { runWorker, runEmergencyWorker } from "./worker";
import { runBoostedUpgrader, runUpgrader } from "./upgrader";
import { runPowerHarvester, runPowerHealer, runPowerCarrier } from "./powerMiner";
import { RoomInfo } from "room/roomInfo";


export let roles: {
    [roleName in CreepRole]?: (creep: Creep, room?: RoomInfo) => void;
} = {};
export default roles;

export function registerCreepRole(drivers: {
    [roleName in CreepRole]?: (creep: Creep, room?: RoomInfo) => void;
}) {
    roles = _.assign(roles, _.mapValues(drivers));
}

registerCreepRole({
    build: runBuilder,
    carry: runCarrier,
    harvest: runHarvester,
    upgrade: runUpgrader,
    work: runWorker,
    emergency: runEmergencyWorker,
    manage: runManager,
    mine: runMiner,

    xUpgrade: runBoostedUpgrader
});

registerCreepRole({
    "pbHarv": runPowerHarvester,
    "pbHeal": runPowerHealer,
    "pbCarry": runPowerCarrier,
})
