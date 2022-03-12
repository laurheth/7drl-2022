import { FOV } from "roguelike-pumpkin-patch";
import Entity from "./Entity";
import Thing from "./Thing";
import GameMap from "./GameMap";
import NetHandler from "./NetHandler";
import { ThingUpdate } from "../interfaces/NetInterfaces";
import UIManager from "./UIManager";

class Player extends Entity {

    /**
     * Networking handler.
     */
    net:NetHandler;

    /**
     * FOV handler
     */
    fov: FOV;

    /**
     * Updates to send during this cycle
     */
    otherThingsToUpdate:Thing[] = [];

    /**
     * UI Manager
     */
    uiManager:UIManager;

    constructor(position:[number,number,number], map:GameMap) {
        super('🦝', position, map);
        window.addEventListener("keydown", (event:KeyboardEvent) => this.handler(event));
        map.cameraPosition = this.position;
        this.net = map.game.net;
        this.kind = "player";
        this.map.player = this;
        const me = this;
        this.fov = new FOV((position:number[]):boolean => {
            const tile = me.map.getTile(position[0], position[1], me.position[2]);
            if (tile) tile.visible = true;
            return tile !== null && tile.passable && tile.art !== '+';
        }, 20);
        this.uiManager = this.map.game.uiManager;
        this.uiManager.updateControls(this, map);
    }

    handler(event:KeyboardEvent) {
        if (this.falling) {
            return;
        }
        let doRefresh = false;
        console.log("Keypress for " + this.id + " is " + event.key);
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
            case ">":
            case "e":
                doRefresh = this.step([0, 0, -1]);
                break;
            case "<":
            case "q":
                doRefresh = this.step([0, 0, 1]);
                break;
            case "g":
                if (this.tile && this.tile.garbage) {
                    doRefresh = this.grabThing(this.tile.garbage);
                }
                break;
            case "p":
                const chutePosition = this.adjacentChuteExists();
                doRefresh = this.dropThing(chutePosition);
                break;
            default:
                break;
        }
        if (doRefresh) {
            this.updateAndRefresh();
        }
    }

    /**
     * Send out updates and refresh the display
     */
    updateAndRefresh() {
        const updates:ThingUpdate[] = [{
            id: this.id,
            position: this.position
        }];

        while (this.otherThingsToUpdate.length > 0) {
            const thing:Thing|undefined = this.otherThingsToUpdate.pop();
            if (thing) {
                const update:ThingUpdate = {
                    id: thing.id,
                    position: thing.position,
                };
                if (thing.hidden) {
                    update.message = "status:hidden";
                } else {
                    update.message = "status:show";
                }
                updates.push(update);
            }
        }

        this.net.broadcast({
            requestType: "Updates",
            sender: this.id,
            updates: updates
        });
        
        this.map.refresh();

        this.uiManager.updateControls(this, this.map);
    }

    /**
     * Move. Also, update the camera when we do.
     */
    move(newPosition:[number, number, number]):boolean {
        const result = super.move(newPosition);
        this.position.forEach((x,i) => this.map.cameraPosition[i] = x);
        this.uiManager.updateControls(this, this.map);
        return result;
    }

    /**
     * Add some extra tracking to interactions
     */
    interact(otherEntity:Entity):(()=>void)|null {
        this.otherThingsToUpdate.push(otherEntity);
        return super.interact(otherEntity);
    }

    dropThing(position?:[number, number, number]|null): boolean {
        if (this.holding) {
            this.otherThingsToUpdate.push(this.holding);
            this.holding.trackFalling = this.id;
            this.uiManager.addMessageToLog(`You drop the ${this.holding.getName()}.`)
        }
        return super.dropThing(position);
    }

    grabThing(thingToGrab: Thing): boolean {
        const result = super.grabThing(thingToGrab);
        if (this.holding) {
            this.otherThingsToUpdate.push(this.holding);
            this.uiManager.addMessageToLog(`You pick up the ${this.holding.getName()}.`)
        }
        return result;
    }

    getName(lowerCase:boolean=true) {
        if (lowerCase) {
            return "you";
        } else {
            return "You";
        }
    }

    adjacentChuteExists():[number, number, number]|null {
        if (!this.map || !this.tile) {
            return null;
        }
        const position = this.tile.position;
        let chutePosition:[number, number, number]|null = null;
        for (let dx=-1; dx<2; dx++) {
            for (let dy=-1; dy<2; dy++) {
                const otherTile = this.map.getTile(
                    position[0] + dx,
                    position[1] + dy,
                    position[2]
                );
                if (otherTile && otherTile.art === ' ') {
                    chutePosition = otherTile.position;
                }
            }
        }
        return chutePosition;
    }

}

export default Player;