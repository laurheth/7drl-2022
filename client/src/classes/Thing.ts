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
    layer:number;
    id:number;
    kind:string;
    falling:boolean;
    fallingInterval:number;
    name:string|undefined;

    onDeath:(()=>void)|undefined;

    constructor(art:string, position:[number,number,number], map:GameMap) {
        this.art = art;
        this.position = [...position];
        this.map = map;
        const tile = map.getTile(...position);
        this.layer = -5;
        if (tile) {
            this.tile = tile;
            this.tile.putThing(this);
        } else {
            this.tile = null;
        }
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
        if (this.falling && (newPosition[0] !== this.position[0] || newPosition[1] !== this.position[1])) {
            return false;
        }
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
            }
        }
        // Idk, we landed on something, don't think about it too hard
        if (this.falling) {
            this.falling = false;
            clearInterval(this.fallingInterval);
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
}

export default Thing;
