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

    getArt() {
        return this.art;
    }
}

export default Thing;
