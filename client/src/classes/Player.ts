import Entity from "./Entity";
import GameMap from "./GameMap";
import NetHandler from "./NetHandler";

class Player extends Entity {

    /**
     * Networking handler.
     */
    net:NetHandler;

    constructor(position:[number,number,number], map:GameMap) {
        super('@', position, map);
        window.addEventListener("keydown", (event:KeyboardEvent) => this.handler(event));
        map.cameraPosition = position;
        this.net = map.game.net;
    }

    handler(event:KeyboardEvent) {
        let doRefresh = false;
        switch (event.key) {
            case "ArrowRight":
            case "Right":
            case "d":
                doRefresh = this.step([1, 0, 0]);
                break;
            case "ArrowLeft":
            case "Left":
            case "a":
                doRefresh = this.step([-1, 0, 0]);
                break;
            case "ArrowUp":
            case "Up":
            case "w":
                doRefresh = this.step([0, -1, 0]);
                break;
            case "ArrowDown":
            case "Down":
            case "s":
                doRefresh = this.step([0, 1, 0]);
                break;
            default:
                break;
        }
        if (doRefresh) {
            this.position.forEach((x,i) => this.map.cameraPosition[i] = x);
            this.net.broadcast({
                id: this.id,
                position: this.position
            })
            this.map.refresh();
        }
    }
}

export default Player;