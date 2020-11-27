import { globalCreeps } from "creep"
import "./loot"
import { runLootCarrier } from "./loot"

export function tickWar() {
    globalCreeps["rCarry"]?.forEach(runLootCarrier)
}
