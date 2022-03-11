import GameMap from "./GameMap";
import Thing from "./Thing";
import Tile from "./Tile";

/**
 * Something that exists in the map and moves around.
 */
class Entity extends Thing {

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

        let postMove:(()=>void)|null = null;
        if (newTile && newTile.entity) {
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
        if (this.kind === "player") {
            const tile:Tile|null = otherEntity.tile;
            const myTile:Tile|null = this.tile;
            if (tile && tile.passable && myTile && myTile.passable) {
                tile.removeThing(otherEntity);
                return ()=>otherEntity.move(myTile.position);
            }
        }
        return null;
    }
}

export default Entity;
