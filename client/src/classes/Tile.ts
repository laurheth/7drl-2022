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
     * Internal representation of the tile; I might not actually show this.
     */
    art:string;

    /**
     * Classlist of the tile.
     */
    classList:string[];

    /**
     * Classlist last time the tile was seen
     */
    lastSeenClassList:string[];

    /**
     * Hide the base art of the tile.
     */
    hideBaseArt:boolean;

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

    /**
     * Position of this tile
     */
    position:[number, number, number]

    constructor(position:[number, number, number], art:string, classList:string[], passable:boolean, replaceable = true, hideBaseArt:boolean = false) {
        this.art = art;
        this.lastSeen = " ";
        this.visible = false;
        this.entity = null;
        this.garbage = null;
        this.otherShit = [];
        this.passable = passable;
        this.replaceable = replaceable;
        this.position = position;
        this.classList = classList;
        this.hideBaseArt = hideBaseArt;
        this.lastSeenClassList = [];
    }

    /**
     * Get the art at this tile.
     */
    getArt():string {
        if (this.visible) {
            if (this.entity) {
                this.lastSeen = this.entity.getArt();
            } else if (this.garbage) {
                this.lastSeen = this.garbage.getArt();
            } else if (this.otherShit.length > 0) {
                this.lastSeen = this.otherShit[0].getArt();
            } else {
                this.lastSeen = this.art;
            }
        }
        return this.lastSeen;
    }

    /**
     * Get the class list of the tile.
     */
    getClassList():string[] {
        if (this.visible) {
            this.lastSeenClassList = [...this.classList];
            if (this.hideBaseArt) {
                this.lastSeenClassList.push("hideText");
            }
            return this.lastSeenClassList;
        } else {
            return [...this.lastSeenClassList, "unseen"];
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