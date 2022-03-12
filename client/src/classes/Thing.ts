import GameMap from "./GameMap";
import Tile from "./Tile";

/**
 * Something that exists on the map and has art.
 */
class Thing {
    art:string;
    position:[number,number,number];
    tile:Tile|null;
    map:GameMap;
    id:number;
    kind:string;
    falling:boolean;
    fallingInterval:number;
    name:string|undefined;

    onDeath:(()=>void)|undefined;

    constructor(art:string, position:[number,number,number], map:GameMap) {
        this.art = art;
        this.map = map;
        const tile = this.findEmptySpot(position);
        if (tile) {
            position = [...tile.position];
            this.tile = tile;
            this.tile.putThing(this);
        } else {
            this.tile = null;
        }
        this.position = [...position];
        this.id = map.getId();
        console.log("Thing id " + this.id);
        if (!this.map.things[this.id]) {
            this.map.things[this.id] = this;
        }
        this.kind = "thing";
        this.falling = false;
        this.fallingInterval = 0;
    }

    /**
     * Move to a new position.
     */
    move(newPosition:[number, number, number]):boolean {
        const newTile = this.map.getTile(...newPosition);
        if (newTile) {
            if (newTile.putThing(this)) {
                if (this.tile) {
                    this.tile.removeThing(this);
                }
                this.tile = newTile;
                this.position = newPosition;
                if (!this.falling && newTile.art === ' ') {
                    // Uh oh, no floor. Time to fall!
                    this.falling = true;
                    this.fallingInterval = window.setInterval(()=>{
                        this.move([this.position[0],this.position[1],this.position[2]-1])
                        this.map.refresh();
                    }, 200);
                } else if (this.falling && newTile.art !== ' ') {
                    this.falling = false;
                    clearInterval(this.fallingInterval);
                }
                return true;
            } else if (this.falling) {
                const tile = this.findEmptySpot(newPosition);
                if (tile) {
                    this.move(tile.position);
                }
            }
        }
        return false;
    }

    /**
     * Die
     */
    die() {
        if (this.tile) {
            this.tile.removeThing(this);
            if (this.onDeath) {
                this.onDeath();
            }
        }
    }

    getArt() {
        return this.art;
    }

    setId(id:number) {
        if (this.map.things[this.id] === this) {
            delete this.map.things[this.id];
        }
        this.id = id;
        this.map.things[id] = this;
    }
    
    /**
     * Get the name of this entity.
     */
     getName() {
        if (this.name) {
            return this.name;
        } else {
            return this.kind;
        }
    }

    /**
     * Set the name of this entity.
     */
    setName(name:string) {
        this.name = name;
    }

    /**
     * Find an empty spot to go
     */
    findEmptySpot(position:[number, number, number]):Tile|null {
        let distance = 0;
        let validTile:Tile|null = null;
        do {
            for(let dx=-distance; dx<=distance; dx++) {
                for (let dy=-distance; dy<=distance; dy++) {
                    if (Math.abs(dx) !== distance || Math.abs(dy) !== distance) {
                        // Skip tiles we have already checked
                        continue;
                    }
                    const thisTile = this.map.getTile(
                        position[0] + dx,
                        position[1] + dy,
                        position[2]
                    );
                    if (thisTile && this.canFitHere(thisTile)) {
                        validTile = thisTile;
                    }
                }
            }
            distance++;
        } while (!validTile && distance < 50);

        return validTile;
    }

    canFitHere(tile:Tile):boolean {
        return tile !== undefined;
    }
}

export default Thing;
