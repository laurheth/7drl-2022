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
                return true;
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
}

export default Thing;
