import { movingCreeps } from "./data";
import { goToRoom, goTo } from "./goTo";

export function processMovement() {
    _.forIn(movingCreeps, (pos, name) => {
        const creep = Game.creeps[name] || Game.powerCreeps[name];
        if ('room' in pos) {
            goToRoom(creep, pos.room);
        } else {
            goTo(creep, pos);
        }
    })
}

export { prepareMovement } from "./data";
import "./bypass";
import "./prototype";
