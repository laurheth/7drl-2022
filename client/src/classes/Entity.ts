import GameMap from "./GameMap";
import Thing from "./Thing";
import Tile from "./Tile";

/**
 * Something that exists in the map and moves around.
 */
class Entity extends Thing {

    onInteract:((actor:Entity)=>void)|undefined;
    pushable:boolean = false;

    constructor(art:string, position:[number,number,number], map:GameMap) {
        super(art, position, map);
        this.kind = "entity";
    }

    /**
     * Do a steppy.
     */
    step(diff:[number, number, number]):boolean {

        if (diff[2] < 0 && this.tile?.art !== '>') {
            return false;
        }
        if (diff[2] > 0 && this.tile?.art !== '<') {
            return false;
        }

        const newPosition:[number, number, number] = [
            diff[0] + this.position[0],
            diff[1] + this.position[1],
            diff[2] + this.position[2]
        ];
        return this.move(newPosition);
    }

    /**
     * Expand upon move.
     */
    move(newPosition:[number, number, number]):boolean {
        const newTile:Tile|null = this.map.getTile(...newPosition);
        
        // Handle doors
        if (newTile && newTile.art === '+') {
            newTile.art = '-';
            let index = newTile.classList.indexOf('doorClosed');
            newTile.classList.splice(index, 1);
            newTile.classList.push('doorOpen');

            const me = this;
            // close the door behind you automatically
            const interval = window.setInterval(function closeDoor() {
                if (!newTile.entity) {
                    newTile.art = '+';
                    index = newTile.classList.indexOf('doorOpen');
                    newTile.classList.splice(index, 1);
                    newTile.classList.push('doorClosed');
                    me.map.refresh();
                    window.clearInterval(interval);
                }
            }, 3000);

            return true;
        }

        let postMove:(()=>void)|null = null;
        if (newTile && newTile.entity && newTile.entity !== this) {
            postMove = this.interact(newTile.entity);
        }
        
        const result = super.move(newPosition);

        if (postMove) {
            postMove();
        }

        return result;
    }

    /**
     * Interact with someone else.
     */
    interact(otherEntity:Entity):(()=>void)|null {
        // First try to push
        if (otherEntity.pushable) {
            const getPushedTo:[number, number, number] = [
                2 * otherEntity.position[0] - this.position[0],
                2 * otherEntity.position[1] - this.position[1],
                otherEntity.position[2]
            ];
            if (otherEntity.move(getPushedTo)) {
                if (otherEntity.tile && otherEntity.tile.visible) {
                    this.map.game.uiManager.addMessageToLog(`${otherEntity.getName()} is pushed!`);
                }
                return null;
            }
        }
        // If that fails, switch spots
        if (this.kind === "player" && !this.falling) {
            const tile:Tile|null = otherEntity.tile;
            const myTile:Tile|null = this.tile;
            if (tile && tile.passable && myTile && myTile.passable) {

                if (otherEntity.tile && otherEntity.tile.visible) {
                    if (this.getName() === "You") {
                        this.map.game.uiManager.addMessageToLog(`${this.getName()} switch places with ${otherEntity.getName()}!`);
                    } else {
                        this.map.game.uiManager.addMessageToLog(`${this.getName()} switches places with ${otherEntity.getName(true)}!`);
                    }
                }

                tile.removeThing(otherEntity);
                return ()=>otherEntity.move(myTile.position);
            }
        }
        if (otherEntity.onInteract) {
            otherEntity.onInteract(this);
        }
        return null;
    }

    canFitHere(tile:Tile):boolean {
        return tile && tile.passable && !tile.entity;
    }
}

export default Entity;
