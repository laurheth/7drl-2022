import Garbage from "./Garbage";
import Entity from "./Entity";
import Thing from "./Thing";

/**
 * Data about an individual tile.
 */
class Tile {

    /**
     * Is the tile currently visible?
     */
    visible:boolean;

    /**
     * Last seen appearance of the tile
     */
    lastSeen:string;

    /**
     * Base appearance of the tile.
     */
    art:string;

    /**
     * Whether or not this tile is passable
     */
    passable:boolean;

    /**
     * Whether this tile can be replaced.
     */
    replaceable:boolean;

    /**
     * Things in this tile
     */
    entity:Entity|null;
    garbage:Garbage|null;
    otherShit:Thing[];

    constructor(art:string, passable:boolean, replaceable = true) {
        this.art = art;
        this.lastSeen = art;
        this.visible = true;
        this.entity = null;
        this.garbage = null;
        this.otherShit = [];
        this.passable = passable;
        this.replaceable = replaceable;
    }

    /**
     * Get the art at this tile.
     */
    getArt():string {
        if (this.visible) {
            if (this.entity) {
                return this.entity.getArt();
            } else if (this.garbage) {
                return this.garbage.getArt();
            } else if (this.otherShit.length > 0) {
                return this.otherShit[0].getArt();
            }
            return this.art;
        } else {
            return this.lastSeen;
        }
    }

    /**
     * Put a thing in the tile
     */
    putThing(thing:Thing):boolean {
        if (thing instanceof Entity) {
            if (!this.passable || this.entity) {
                return false;
            } else {
                this.entity = thing;
                return true;
            }
        } else if (thing instanceof Garbage) {
            if (this.garbage) {
                return false;
            } else {
                this.garbage = thing;
                return true;
            }
        } else {
            this.otherShit.unshift(thing);
            return true;
        }
    }

    /**
     * Remove a thing from the tile.
     */
    removeThing(thing:Thing) {
        if (this.entity === thing) {
            this.entity = null;
        } else if (this.garbage === thing) {
            this.garbage = null;
        } else {
            const index = this.otherShit.indexOf(thing);
            if (index >= 0) {
                this.otherShit.splice(index, 1);
            }
        }
    }
}

export default Tile;